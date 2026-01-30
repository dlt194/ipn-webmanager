import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { ipoRequestText, ipoWithSession } from "@/lib/ipo-client";
import { resolveOwner } from "@/lib/auth";

export const runtime = "nodejs";

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function parseLicensesAny(text: string): {
  licenses: Array<Record<string, string>>;
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

      const licenses = arr
        .map((item) => asRecord(item)?.License)
        .map((lic) => asRecord(lic))
        .filter((lic): lic is Record<string, unknown> => lic !== null)
        .map((lic) => {
          const normalized: Record<string, string> = {};
          for (const [key, value] of Object.entries(lic)) {
            normalized[key] = asString(value);
          }

          const guid = asString(
            lic["@GUID"] ?? lic.GUID ?? normalized["@GUID"] ?? normalized.GUID,
          );

          return {
            guid,
            licenseKey: asString(lic.LicenseKey ?? normalized.LicenseKey),
            source: asString(lic.Source ?? normalized.Source),
            type: asString(lic.Type ?? normalized.Type),
            status: asString(lic.Status ?? normalized.Status),
            quantity: asString(lic.Quantity ?? normalized.Quantity),
            freeInstances: asString(lic.FreeInstances ?? normalized.FreeInstances),
            expiryDate: asString(lic.ExpiryDate ?? normalized.ExpiryDate),
            mode: asString(lic.Mode ?? normalized.Mode),
            displayName: asString(lic.DisplayName ?? normalized.DisplayName),
            ...normalized,
          };
        });

      return { licenses, format: "json" };
    }

    if (status === "0") {
      return { licenses: [], format: "json" };
    }
  } catch {
    // fallthrough
  }

  return { licenses: [], format: "unknown" };
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
    const { status, text, contentType } = await ipoWithSession({
      host: cfg.host,
      username: cfg.username,
      password,
      allowInsecureTls: true,
      run: (auth) =>
        ipoRequestText({
          host: cfg.host,
          auth,
          path: "/admin/v1/licenses",
          allowInsecureTls: true,
        }),
    });

    const parsed = parseLicensesAny(text);

    return NextResponse.json(
      {
        licenses: parsed.licenses,
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
    return NextResponse.json(
      { error: msg, licenses: [], raw: returnRaw ? null : undefined },
      { status: 502 },
    );
  }
}
