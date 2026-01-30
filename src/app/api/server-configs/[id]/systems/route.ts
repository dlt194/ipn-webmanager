import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { ipoRequestText, ipoWithSession } from "@/lib/ipo-client";
import { resolveOwner } from "@/lib/auth";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const LOG_DIR = "/tmp/ipo-requests";

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function parseSystemsAny(text: string): {
  systems: Array<Record<string, string>>;
  format: "json" | "unknown";
} {
  try {
    const parsed = JSON.parse(text) as unknown;
    const resp = asRecord(parsed)?.response;
    const respRec = asRecord(resp);
    const status = asString(respRec?.["@status"] ?? respRec?.status);

    if (status === "1") {
      const dataRec = asRecord(respRec?.data);
      const ws = dataRec?.ws_object;
      const arr = Array.isArray(ws) ? ws : ws ? [ws] : [];

      const systems = arr
        .map((item) => asRecord(item)?.System)
        .map((sys) => asRecord(sys))
        .filter((sys): sys is Record<string, unknown> => sys !== null)
        .map((sys) => {
          const normalized: Record<string, string> = {};
          for (const [key, value] of Object.entries(sys)) {
            normalized[key] = asString(value);
          }

          const guid = asString(
            sys["@GUID"] ?? sys.GUID ?? normalized["@GUID"] ?? normalized.GUID,
          );

          const name = asString(
            sys.Name ??
              sys.DisplayName ??
              sys.SystemName ??
              normalized.Name ??
              normalized.DisplayName ??
              normalized.SystemName,
          );

          const majorVersion = asString(
            sys.MajorVersion ?? normalized.MajorVersion,
          );
          const minorVersion = asString(
            sys.MinorVersion ?? normalized.MinorVersion,
          );
          const buildVersion = asString(
            sys.BuildVersion ?? normalized.BuildVersion,
          );
          const systemVersionSpecialRel = asString(
            sys.SystemVersionSpecialRel ?? normalized.SystemVersionSpecialRel,
          );
          const systemVersionFeaturePack = asString(
            sys.SystemVersionFeaturePack ?? normalized.SystemVersionFeaturePack,
          );
          const systemVersionMaint = asString(
            sys.SystemVersionMaint ?? normalized.SystemVersionMaint,
          );
          const version = majorVersion
            ? `${majorVersion}.${minorVersion || "0"}.${systemVersionMaint || "0"}.${systemVersionSpecialRel || "0"}.${systemVersionFeaturePack || "0"} build ${buildVersion || "0"}`
            : "";

          const lans = asRecord(sys.LANS ?? normalized.LANS);
          const lanArrRaw = (lans?.LAN ??
            (lans?.Lan as unknown)) as unknown;
          const lanArr = Array.isArray(lanArrRaw)
            ? lanArrRaw
            : lanArrRaw
              ? [lanArrRaw]
              : [];

          const findLanIp = (id: string) => {
            const match = lanArr
              .map((lan) => asRecord(lan))
              .find((lan) => asString(lan?.["@id"]).toUpperCase() === id);
            return asString(
              match?.IPAddress ??
                match?.IpAddress ??
                match?.LANIPAddress ??
                match?.LANIpAddress,
            );
          };

          const lan1IpAddress = findLanIp("LAN1");
          const lan2IpAddress = findLanIp("LAN2");

          const voicemail = asRecord(sys.Voicemail ?? normalized.Voicemail);
          const voicemailType = asString(voicemail?.Type ?? voicemail?.type);

          return {
            guid,
            name,
            version,
            lan1IpAddress,
            lan2IpAddress,
            voicemailType,
            ...normalized,
          };
        });

      return { systems, format: "json" };
    }

    if (status === "0") {
      return { systems: [], format: "json" };
    }
  } catch {
    // fallthrough
  }

  return { systems: [], format: "unknown" };
}

function formatResponseText(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  const maxLen = 2000;
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
}

async function logSystemsGet(entry: {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
  responseText?: string;
}) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const now = new Date();
    const file = path.join(LOG_DIR, `${now.toISOString().slice(0, 10)}.log`);
    const payload = {
      ts: now.toISOString(),
      method: "GET",
      url: entry.url,
      ok: entry.ok,
      status: entry.status,
      error: entry.error,
      responseText: entry.responseText,
    };
    await fs.appendFile(file, `${JSON.stringify(payload)}\n`, "utf8");
  } catch {
    // best-effort logging only
  }
}

async function loadConfigForOwner(id: string) {
  const session = await getServerSession(authOptions);
  const owner = resolveOwner(session);
  if (!owner) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const cfg = await prisma.serverConfig.findFirst({
    where: { id, ownerUpn: owner },
    select: {
      host: true,
      username: true,
      pwdCipher: true,
      pwdIv: true,
      pwdTag: true,
    },
  });

  if (!cfg) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const password = decryptSecret({
    pwdCipher: cfg.pwdCipher,
    pwdIv: cfg.pwdIv,
    pwdTag: cfg.pwdTag,
  });

  return { cfg, password };
}

function getDebugFlags(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const returnRaw = debug || process.env.IPO_DEBUG_RETURN_RAW === "1";
  return { returnRaw };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const loaded = await loadConfigForOwner(id);
  if ("error" in loaded) return loaded.error;

  const { cfg, password } = loaded;
  const { returnRaw } = getDebugFlags(req);

  try {
    const requestUrl = `https://${cfg.host}:7070/WebManagement/ws/sdk/admin/v1/systems`;
    const { status, text, contentType } = await ipoWithSession({
      host: cfg.host,
      username: cfg.username,
      password,
      allowInsecureTls: true,
      run: (auth) =>
        ipoRequestText({
          host: cfg.host,
          auth,
          path: "/admin/v1/systems",
          allowInsecureTls: true,
        }),
    });

    void logSystemsGet({
      url: requestUrl,
      ok: true,
      status,
      responseText: formatResponseText(text),
    });

    const parsed = parseSystemsAny(text);

    return NextResponse.json(
      {
        systems: parsed.systems,
        raw: returnRaw ? text : undefined,
        meta: {
          upstreamStatus: status,
          upstreamContentType: contentType,
          parsedAs: parsed.format,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    void logSystemsGet({
      url: `https://${loaded.cfg.host}:7070/WebManagement/ws/sdk/admin/v1/systems`,
      ok: false,
      error: msg,
    });
    return NextResponse.json(
      { error: msg, systems: [], raw: returnRaw ? null : undefined },
      { status: 502 },
    );
  }
}
