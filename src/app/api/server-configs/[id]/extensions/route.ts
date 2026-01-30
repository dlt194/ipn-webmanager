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

function parseExtensionsAny(text: string): {
  extensions: Array<Record<string, string>>;
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

      const extensions = arr
        .map((item) => asRecord(item)?.Extension)
        .map((ext) => asRecord(ext))
        .filter((ext): ext is Record<string, unknown> => ext !== null)
        .map((ext) => {
          const normalized: Record<string, string> = {};
          for (const [key, value] of Object.entries(ext)) {
            normalized[key] = asString(value);
          }

          const guid = asString(
            ext["@GUID"] ?? ext.GUID ?? normalized["@GUID"] ?? normalized.GUID,
          );

          return {
            guid,
            id: asString(ext.Id ?? normalized.Id),
            extension: asString(ext.Extension ?? normalized.Extension),
            typeInfo: asString(ext.TypeInfo ?? normalized.TypeInfo),
            callerDisplayType: asString(
              ext.CallerDisplayType ?? normalized.CallerDisplayType,
            ),
            module: asString(ext.Module ?? normalized.Module),
            port: asString(ext.Port ?? normalized.Port),
            location: asString(ext.Location ?? normalized.Location),
            ...normalized,
          };
        });

      return { extensions, format: "json" };
    }

    if (status === "0") {
      return { extensions: [], format: "json" };
    }
  } catch {
    // fallthrough
  }

  return { extensions: [], format: "unknown" };
}

function parseIpoError(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as {
      response?: {
        "@status"?: string;
        data?: {
          ws_object?: {
            SMAError?: {
              error?: { error_desc?: string };
            };
          };
        };
      };
    };

    const status = parsed?.response?.["@status"];
    if (status === "0" || status === 0) {
      return (
        parsed.response?.data?.ws_object?.SMAError?.error?.error_desc ??
        "IPO returned an error."
      );
    }
  } catch {
    // Ignore parse errors
  }

  return null;
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
          path: "/admin/v1/extensions",
          allowInsecureTls: true,
        }),
    });

    const parsed = parseExtensionsAny(text);

    return NextResponse.json(
      {
        extensions: parsed.extensions,
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
      { error: msg, extensions: [], raw: returnRaw ? null : undefined },
      { status: 502 },
    );
  }
}

type UpdateExtensionBody = {
  guid?: string;
  extension?: string;
  typeInfo?: string;
  callerDisplayType?: string;
  module?: string;
  port?: string;
  location?: string;
};

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const loaded = await loadConfigForOwner(id);
  if ("error" in loaded) return loaded.error;

  const body = (await req.json().catch(() => null)) as UpdateExtensionBody | null;
  if (!body?.guid || typeof body.guid !== "string") {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }

  const guid = body.guid.trim();
  if (!guid) {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }

  const extension: Record<string, string> = {
    "@GUID": guid,
  };

  const addField = (key: string, value: string | undefined) => {
    if (value === undefined || value === null) return;
    if (value === "") return;
    extension[key] = value;
  };

  addField("Extension", body.extension);
  addField("TypeInfo", body.typeInfo);
  addField("CallerDisplayType", body.callerDisplayType);
  addField("Module", body.module);
  addField("Port", body.port);
  addField("Location", body.location);

  const payload = {
    data: {
      ws_object: {
        Extension: extension,
      },
    },
  };

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
          path: "/admin/v1/extensions",
          method: "PUT",
          body: payload,
          allowInsecureTls: true,
        }),
    });

    const ipoError = parseIpoError(text);
    if (ipoError) {
      return NextResponse.json(
        {
          ok: false,
          error: ipoError,
          raw: returnRaw ? text : undefined,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        raw: returnRaw ? text : undefined,
        meta: {
          upstreamStatus: status,
          upstreamContentType: contentType,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg, ok: false, raw: returnRaw ? null : undefined },
      { status: 502 },
    );
  }
}

type CreateExtensionBody = {
  extension?: string;
  typeInfo?: string;
  callerDisplayType?: string;
  module?: string;
  port?: string;
  location?: string;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const loaded = await loadConfigForOwner(id);
  if ("error" in loaded) return loaded.error;

  const body = (await req.json().catch(() => null)) as CreateExtensionBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const extensionValue =
    typeof body.extension === "string" ? body.extension.trim() : "";

  if (!extensionValue) {
    return NextResponse.json(
      { error: "extension is required for create" },
      { status: 400 },
    );
  }

  const extension: Record<string, string> = {};

  const addField = (key: string, value: string | undefined) => {
    if (value === undefined || value === null) return;
    if (value === "") return;
    extension[key] = value;
  };

  addField("Extension", extensionValue);
  addField("TypeInfo", body.typeInfo);
  addField("CallerDisplayType", body.callerDisplayType);
  addField("Module", body.module);
  addField("Port", body.port);
  addField("Location", body.location);

  const payload = {
    data: {
      ws_object: {
        Extension: extension,
      },
    },
  };

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
          path: "/admin/v1/extensions",
          method: "POST",
          body: payload,
          allowInsecureTls: true,
        }),
    });

    const ipoError = parseIpoError(text);
    if (ipoError) {
      return NextResponse.json(
        {
          ok: false,
          error: ipoError,
          raw: returnRaw ? text : undefined,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        raw: returnRaw ? text : undefined,
        meta: {
          upstreamStatus: status,
          upstreamContentType: contentType,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg, ok: false, raw: returnRaw ? null : undefined },
      { status: 502 },
    );
  }
}

type DeleteExtensionBody = {
  guid?: string;
};

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const loaded = await loadConfigForOwner(id);
  if ("error" in loaded) return loaded.error;

  const body = (await req.json().catch(() => null)) as DeleteExtensionBody | null;
  if (!body?.guid || typeof body.guid !== "string") {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }

  const guid = body.guid.trim();
  if (!guid) {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }

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
          path: `/admin/v1/extensions?guid=${encodeURIComponent(guid)}`,
          method: "DELETE",
          allowInsecureTls: true,
        }),
    });

    const ipoError = parseIpoError(text);
    if (ipoError) {
      return NextResponse.json(
        {
          ok: false,
          error: ipoError,
          raw: returnRaw ? text : undefined,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        raw: returnRaw ? text : undefined,
        meta: {
          upstreamStatus: status,
          upstreamContentType: contentType,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: msg, ok: false, raw: returnRaw ? null : undefined },
      { status: 502 },
    );
  }
}
