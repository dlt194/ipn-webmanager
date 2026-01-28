import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { ipoRequestText, ipoWithSession } from "@/lib/ipo-client";
import { parseUsersAny } from "@/lib/ipo-parsers";
import { resolveOwner } from "@/lib/auth";

export const runtime = "nodejs";

async function loadConfigForOwner(id: string) {
  const session = await getServerSession(authOptions);
  const owner = resolveOwner(session);
  if (!owner) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
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
          path: "/admin/v1/users",
          allowInsecureTls: true,
          // Don’t force XML here; your IPO may return JSON with weird CT.
          // Keep broad accept and let the parser decide.
        }),
    });

    const parsed = parseUsersAny(text);

    return NextResponse.json(
      {
        users: parsed.users,
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
      { error: msg, users: [], raw: returnRaw ? null : undefined },
      { status: 502 },
    );
  }
}

type UpdateUserBody = {
  guid?: string;
  name?: string;
  fullName?: string;
  extension?: string;
  assignedPackage?: string;
  canIntrude?: string | boolean;
  cannotBeIntruded?: string | boolean;
  dndExceptions?: string;
  doNotDisturb?: string | boolean;
  expansionType?: string;
  flareEnabled?: string | boolean;
  flare?: string | boolean;
  forceAccountCode?: string | boolean;
  idleLinePreference?: string | boolean;
  loginCode?: string;
  mobilityFeatures?: string | boolean;
  oneXClient?: string | boolean;
  oneXTelecommuter?: string | boolean;
  outgoingCallBar?: string | boolean;
  outOfHoursUserRights?: string;
  userRightsTimeProfile?: string;
  password?: string;
  phoneType?: string;
  priority?: string;
  receptionist?: string | boolean;
  remoteWorker?: string | boolean;
  sipContact?: string;
  sipName?: string;
  specificBstType?: string;
  twinningType?: string;
  umsWebServices?: string | boolean;
  userRights?: string;
  voicemailCode?: string;
  voicemailEmail?: string;
  voicemailOn?: string | boolean;
  webCollaboration?: string | boolean;
  xDirectory?: string | boolean;
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const loaded = await loadConfigForOwner(id);
  if ("error" in loaded) return loaded.error;

  const body = (await req.json().catch(() => null)) as UpdateUserBody | null;
  if (!body?.guid || typeof body.guid !== "string") {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }

  const guid = body.guid.trim();
  if (!guid) {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }

  function normalizeBoolean(
    value: string | boolean | undefined,
  ): "true" | "false" | "" | null {
    if (value === undefined || value === null || value === "") return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value !== "string") return null;
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "yes") return "true";
    if (v === "false" || v === "no") return "false";
    return null;
  }

  const booleanFields = {
    canIntrude: normalizeBoolean(body.canIntrude),
    cannotBeIntruded: normalizeBoolean(body.cannotBeIntruded),
    doNotDisturb: normalizeBoolean(body.doNotDisturb),
    flareEnabled: normalizeBoolean(body.flareEnabled),
    forceAccountCode: normalizeBoolean(body.forceAccountCode),
    idleLinePreference: normalizeBoolean(body.idleLinePreference),
    mobilityFeatures: normalizeBoolean(body.mobilityFeatures),
    oneXClient: normalizeBoolean(body.oneXClient),
    oneXTelecommuter: normalizeBoolean(body.oneXTelecommuter),
    outgoingCallBar: normalizeBoolean(body.outgoingCallBar),
    receptionist: normalizeBoolean(body.receptionist),
    remoteWorker: normalizeBoolean(body.remoteWorker),
    umsWebServices: normalizeBoolean(body.umsWebServices),
    voicemailOn: normalizeBoolean(body.voicemailOn),
    webCollaboration: normalizeBoolean(body.webCollaboration),
    xDirectory: normalizeBoolean(body.xDirectory),
    flare: normalizeBoolean(body.flare),
  };

  const invalidBoolean = Object.entries(booleanFields).find(
    ([, value]) => value === null,
  );
  if (invalidBoolean) {
    return NextResponse.json(
      { error: `Invalid boolean value for ${invalidBoolean[0]}` },
      { status: 400 },
    );
  }

  const user: Record<string, string> = {
    "@GUID": guid,
    Name: body.name ?? "",
    FullName: body.fullName ?? "",
    Extension: body.extension ?? "",
    AssignedPackage: body.assignedPackage ?? "",
    CanIntrude: booleanFields.canIntrude ?? "",
    CannotBeIntruded: booleanFields.cannotBeIntruded ?? "",
    DNDExceptions: body.dndExceptions ?? "",
    DoNotDisturb: booleanFields.doNotDisturb ?? "",
    ExpansionType: body.expansionType ?? "",
    FlareEnabled: booleanFields.flareEnabled ?? "",
    Flare: booleanFields.flare ?? "",
    ForceAccountCode: booleanFields.forceAccountCode ?? "",
    IdleLinePreference: booleanFields.idleLinePreference ?? "",
    LoginCode: body.loginCode ?? "",
    MobilityFeatures: booleanFields.mobilityFeatures ?? "",
    OneXClient: booleanFields.oneXClient ?? "",
    OneXTelecommuter: booleanFields.oneXTelecommuter ?? "",
    OutgoingCallBar: booleanFields.outgoingCallBar ?? "",
    OutOfHoursUserRights: body.outOfHoursUserRights ?? "",
    UserRightsTimeProfile: body.userRightsTimeProfile ?? "",
    PhoneType: body.phoneType ?? "",
    Priority: body.priority ?? "",
    Receptionist: booleanFields.receptionist ?? "",
    RemoteWorker: booleanFields.remoteWorker ?? "",
    SIPContact: body.sipContact ?? "",
    SIPName: body.sipName ?? "",
    SpecificBstType: body.specificBstType ?? "",
    TwinningType: body.twinningType ?? "",
    UMSWebServices: booleanFields.umsWebServices ?? "",
    UserRights: body.userRights ?? "",
    VoicemailCode: body.voicemailCode ?? "",
    VoicemailEmail: body.voicemailEmail ?? "",
    VoicemailOn: booleanFields.voicemailOn ?? "",
    WebCollaboration: booleanFields.webCollaboration ?? "",
    XDirectory: booleanFields.xDirectory ?? "",
  };

  if (body.password && body.password.trim().length > 0) {
    user.Password = body.password;
  }

  const payload = {
    response: {
      "@status": "1",
      data: {
        ws_object: {
          User: user,
        },
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
          path: `/admin/v1/users?guid=${encodeURIComponent(guid)}`,
          method: "PUT",
          body: payload,
          allowInsecureTls: true,
        }),
    });

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

type DeleteUserBody = { guid?: string };

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const loaded = await loadConfigForOwner(id);
  if ("error" in loaded) return loaded.error;

  const body = (await req.json().catch(() => null)) as DeleteUserBody | null;
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
          path: `/admin/v1/users?guid=${encodeURIComponent(guid)}`,
          method: "DELETE",
          // Some IPO versions also accept a body envelope, but guid query param
          // is the documented required input parameter.
          allowInsecureTls: true,
        }),
    });

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
