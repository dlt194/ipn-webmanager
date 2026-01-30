import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { ipoRequestText, ipoWithSession } from "@/lib/ipo-client";
import { parseUsersAny } from "@/lib/ipo-parsers";
import { resolveOwner } from "@/lib/auth";

export const runtime = "nodejs";

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

export async function PUT(
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
  };

  const addField = (key: string, value: string | undefined) => {
    if (value === undefined || value === null) return;
    if (value === "") return;
    user[key] = value;
  };

  addField("Name", body.name);
  addField("FullName", body.fullName);
  addField("Extension", body.extension);
  addField("AssignedPackage", body.assignedPackage);
  addField("CanIntrude", booleanFields.canIntrude ?? "");
  addField("CannotBeIntruded", booleanFields.cannotBeIntruded ?? "");
  addField("DNDExceptions", body.dndExceptions);
  addField("DoNotDisturb", booleanFields.doNotDisturb ?? "");
  addField("ExpansionType", body.expansionType);
  addField("FlareEnabled", booleanFields.flareEnabled ?? "");
  addField("Flare", booleanFields.flare ?? "");
  addField("ForceAccountCode", booleanFields.forceAccountCode ?? "");
  addField("IdleLinePreference", booleanFields.idleLinePreference ?? "");
  addField("LoginCode", body.loginCode);
  addField("MobilityFeatures", booleanFields.mobilityFeatures ?? "");
  addField("OneXClient", booleanFields.oneXClient ?? "");
  addField("OneXTelecommuter", booleanFields.oneXTelecommuter ?? "");
  addField("OutgoingCallBar", booleanFields.outgoingCallBar ?? "");
  addField("OutOfHoursUserRights", body.outOfHoursUserRights);
  addField("UserRightsTimeProfile", body.userRightsTimeProfile);
  addField("PhoneType", body.phoneType);
  addField("Priority", body.priority);
  addField("Receptionist", booleanFields.receptionist ?? "");
  addField("RemoteWorker", booleanFields.remoteWorker ?? "");
  addField("SIPContact", body.sipContact);
  addField("SIPName", body.sipName);
  addField("SpecificBstType", body.specificBstType);
  addField("TwinningType", body.twinningType);
  addField("UMSWebServices", booleanFields.umsWebServices ?? "");
  addField("UserRights", body.userRights);
  addField("VoicemailCode", body.voicemailCode);
  addField("VoicemailEmail", body.voicemailEmail);
  addField("VoicemailOn", booleanFields.voicemailOn ?? "");
  addField("WebCollaboration", booleanFields.webCollaboration ?? "");
  addField("XDirectory", booleanFields.xDirectory ?? "");

  if (body.password && body.password.trim().length > 0) {
    user.Password = body.password;
  }

  const payload = {
    data: {
      ws_object: {
        User: user,
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
          path: "/admin/v1/users",
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

type CreateUserBody = {
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

  const body = (await req.json().catch(() => null)) as CreateUserBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const extension =
    typeof body.extension === "string" ? body.extension.trim() : "";
  const assignedPackage =
    typeof body.assignedPackage === "string" ? body.assignedPackage.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !extension || !assignedPackage || !password) {
    return NextResponse.json(
      {
        error:
          "name, extension, assignedPackage, and password are required for create",
      },
      { status: 400 },
    );
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
    outgoingCallBar: normalizeBoolean(body.outgoingCallBar),
    receptionist: normalizeBoolean(body.receptionist),
    remoteWorker: normalizeBoolean(body.remoteWorker),
    umsWebServices: normalizeBoolean(body.umsWebServices),
    voicemailOn: normalizeBoolean(body.voicemailOn),
    webCollaboration: normalizeBoolean(body.webCollaboration),
    xDirectory: normalizeBoolean(body.xDirectory),
    flare: normalizeBoolean(body.flare),
    oneXClient: normalizeBoolean(body.oneXClient),
    oneXTelecommuter: normalizeBoolean(body.oneXTelecommuter),
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

  const user: Record<string, string> = {};

  const addField = (key: string, value: string | undefined) => {
    if (value === undefined || value === null) return;
    if (value === "") return;
    user[key] = value;
  };

  addField("Name", name);
  addField("FullName", typeof body.fullName === "string" ? body.fullName.trim() : "");
  addField("Extension", extension);
  addField("AssignedPackage", assignedPackage);
  addField("CanIntrude", booleanFields.canIntrude ?? "");
  addField("CannotBeIntruded", booleanFields.cannotBeIntruded ?? "");
  addField("DNDExceptions", body.dndExceptions);
  addField("DoNotDisturb", booleanFields.doNotDisturb ?? "");
  addField("ExpansionType", body.expansionType);
  addField("FlareEnabled", booleanFields.flareEnabled ?? "");
  addField("Flare", booleanFields.flare ?? "");
  addField("ForceAccountCode", booleanFields.forceAccountCode ?? "");
  addField("IdleLinePreference", booleanFields.idleLinePreference ?? "");
  addField("LoginCode", body.loginCode);
  addField("MobilityFeatures", booleanFields.mobilityFeatures ?? "");
  addField("OneXClient", booleanFields.oneXClient ?? "");
  addField("OneXTelecommuter", booleanFields.oneXTelecommuter ?? "");
  addField("OutgoingCallBar", booleanFields.outgoingCallBar ?? "");
  addField("OutOfHoursUserRights", body.outOfHoursUserRights);
  addField("UserRightsTimeProfile", body.userRightsTimeProfile);
  addField("Password", password);
  addField("PhoneType", body.phoneType);
  addField("Priority", body.priority);
  addField("Receptionist", booleanFields.receptionist ?? "");
  addField("RemoteWorker", booleanFields.remoteWorker ?? "");
  addField("SIPContact", body.sipContact);
  addField("SIPName", body.sipName);
  addField("SpecificBstType", body.specificBstType);
  addField("TwinningType", body.twinningType);
  addField("UMSWebServices", booleanFields.umsWebServices ?? "");
  addField("UserRights", body.userRights);
  addField("VoicemailCode", body.voicemailCode);
  addField("VoicemailEmail", body.voicemailEmail);
  addField("VoicemailOn", booleanFields.voicemailOn ?? "");
  addField("WebCollaboration", booleanFields.webCollaboration ?? "");
  addField("XDirectory", booleanFields.xDirectory ?? "");

  const payload = {
    data: {
      ws_object: {
        User: user,
      },
    },
  };

  const { cfg, password: adminPassword } = loaded;
  const { returnRaw } = getDebugFlags(req);

  try {
    const { status, text, contentType } = await ipoWithSession({
      host: cfg.host,
      username: cfg.username,
      password: adminPassword,
      allowInsecureTls: true,
      run: (auth) =>
        ipoRequestText({
          host: cfg.host,
          auth,
          path: "/admin/v1/users",
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

type DeleteUserBody = { guid?: string };

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const loaded = await loadConfigForOwner(id);
  if ("error" in loaded) return loaded.error;

  const body = (await req.json().catch(() => null)) as
    | (DeleteUserBody & { name?: string })
    | null;
  if (!body?.guid || typeof body.guid !== "string") {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }

  const guid = body.guid.trim();
  if (!guid) {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }
  const name =
    typeof body.name === "string" && body.name.trim().length > 0
      ? body.name.trim()
      : "";
  if (name.toLowerCase() === "nouser") {
    return NextResponse.json(
      { error: "Cannot delete NoUser." },
      { status: 400 },
    );
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
          blockDeleteIfUserName: name,
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
