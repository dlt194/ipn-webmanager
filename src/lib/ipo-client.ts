import { Agent, type Dispatcher } from "undici";
import { promises as fs } from "node:fs";
import path from "node:path";

const AUTH_HEADERS: Readonly<Record<string, string>> = {
  "X-User-Agent": "Avaya-SDKUser",
  "X-User-Client": "Avaya-WebAdmin",
  // Your tests show it may return JSON body with application/xml CT.
  Accept: "application/json, */*",
  // IPO can be picky even on GET
  "Content-Type": "application/json",
};

const REQ_HEADERS: Readonly<Record<string, string>> = {
  "X-User-Agent": "Avaya-SDKUser",
  "X-User-Client": "Avaya-WebAdmin",
  // Broad accept avoids 406 on some Tomcat configs
  Accept: "application/json, application/xml, text/xml;q=0.9, */*;q=0.8",
  // IPO can be picky even on GET
  "Content-Type": "application/json",
};

function basicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password ?? ""}`, "utf8").toString("base64")}`;
}

function normalizeBase(host: string): string {
  const u = host.startsWith("http")
    ? new URL(host)
    : new URL(`https://${host}`);
  u.port = "7070";
  u.pathname = "/WebManagement/ws/sdk";
  u.search = "";
  u.hash = "";
  return u.toString().replace(/\/$/, "");
}

function makeDispatcher(allowInsecureTls?: boolean): Dispatcher {
  return new Agent({
    connect: { rejectUnauthorized: !allowInsecureTls },
    connectTimeout: 5_000,
    headersTimeout: 10_000,
    bodyTimeout: 20_000,
  });
}

const LOG_DIR = "/tmp/ipo-requests";

function redactSensitive(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redactSensitive);

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (/password|logincode|voicemailcode/i.test(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = redactSensitive(val);
    }
  }
  return out;
}

function formatResponseText(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return JSON.stringify(redactSensitive(parsed));
  } catch {
    // Not JSON; return a truncated string.
    const maxLen = 2000;
    return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
  }
}

async function logIpoRequest(entry: {
  method: string;
  url: string;
  body?: unknown;
  status?: number;
  ok?: boolean;
  error?: string;
  responseText?: string;
}) {
  if (entry.method !== "POST" && entry.method !== "PUT") return;

  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const now = new Date();
    const file = path.join(LOG_DIR, `${now.toISOString().slice(0, 10)}.log`);
    const payload = {
      ts: now.toISOString(),
      method: entry.method,
      url: entry.url,
      ok: entry.ok,
      status: entry.status,
      error: entry.error,
      body: entry.body ? redactSensitive(entry.body) : undefined,
      responseText: entry.responseText,
    };
    await fs.appendFile(file, `${JSON.stringify(payload)}\n`, "utf8");
  } catch {
    // best-effort logging only
  }
}

function getSetCookie(res: Response): string[] {
  const anyHeaders = res.headers as unknown as {
    getSetCookie?: () => string[];
  };
  if (typeof anyHeaders.getSetCookie === "function")
    return anyHeaders.getSetCookie();

  // Fallback (may be combined; best-effort)
  const combined = res.headers.get("set-cookie");
  return combined ? [combined] : [];
}

function cookiePairsFrom(res: Response): string[] {
  return getSetCookie(res)
    .flatMap((h) => h.split(/,(?=[^;]+=[^;]+)/g)) // best-effort split
    .map((c) => c.split(";")[0]?.trim())
    .filter((v): v is string => Boolean(v));
}

function mergeCookiePairs(pairs: string[]): string {
  const map = new Map<string, string>();
  for (const p of pairs) {
    const eq = p.indexOf("=");
    const name = (eq > 0 ? p.slice(0, eq) : p).toUpperCase();
    map.set(name, p);
  }

  // Prefer stable ordering
  const ordered: string[] = [];
  const js = map.get("JSESSIONID");
  if (js) ordered.push(js);

  const sdk = map.get("X-SDK-TOKEN") ?? map.get("SDK-TOKEN");
  if (sdk) ordered.push(sdk);

  for (const [k, v] of map.entries()) {
    if (k === "JSESSIONID" || k === "X-SDK-TOKEN" || k === "SDK-TOKEN")
      continue;
    ordered.push(v);
  }

  return ordered.join("; ");
}

function hasSdkToken(cookieHeader: string): boolean {
  return /(?:^|;\s*)(SDK-Token|X-SDK-Token)=/i.test(cookieHeader);
}

async function readText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export type IpoAuth = { cookieHeader: string };

export async function ipoAuthenticate(args: {
  host: string;
  username: string;
  password: string; // allow empty string
  allowInsecureTls?: boolean;
}): Promise<IpoAuth> {
  const base = normalizeBase(args.host);
  const url = `${base}/security/authenticate`;
  const dispatcher = makeDispatcher(args.allowInsecureTls);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...AUTH_HEADERS,
      Authorization: basicAuth(args.username, args.password ?? ""),
    },
    // @ts-expect-error dispatcher supported by undici fetch
    dispatcher,
    cache: "no-store",
    redirect: "manual",
  });

  const body = await readText(res);

  if (!res.ok) {
    const ct = res.headers.get("content-type");
    throw new Error(
      `IPO authenticate failed (${res.status}) ct=${ct}: ${body || res.statusText}`,
    );
  }

  const cookieHeader = mergeCookiePairs(cookiePairsFrom(res));

  if (
    !/(?:^|;\s*)JSESSIONID=/i.test(cookieHeader) ||
    !hasSdkToken(cookieHeader)
  ) {
    throw new Error(`IPO auth cookies incomplete: ${cookieHeader}`);
  }

  return { cookieHeader };
}

/**
 * Best-effort logout to avoid building up concurrent sessions.
 * Some builds use `/WebManagement/ws/security/authenticate` (no /sdk).
 * We try the /sdk endpoint first, then fall back.
 */
export async function ipoDeauthenticate(args: {
  host: string;
  auth: IpoAuth;
  allowInsecureTls?: boolean;
}): Promise<{ ok: boolean; status: number; text: string }> {
  const dispatcher = makeDispatcher(args.allowInsecureTls);

  const sdkBase = normalizeBase(args.host);
  const candidates = [
    `${sdkBase}/security/authenticate`, // your current /sdk base
    // fallback (no /sdk) – seen in the wild
    sdkBase.replace("/WebManagement/ws/sdk", "/WebManagement/ws") +
      "/security/authenticate",
  ];

  let lastText = "";
  let lastStatus = 0;

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "X-User-Agent": "Avaya-SDKUser",
          "X-User-Client": "Avaya-WebAdmin",
          Accept: "*/*",
          "Content-Type": "application/json",
          Cookie: args.auth.cookieHeader,
        },
        // @ts-expect-error dispatcher supported by undici fetch
        dispatcher,
        cache: "no-store",
      });

      lastStatus = res.status;
      lastText = await readText(res);

      // Many systems return 200/204; some return 405 but still expire server-side later.
      if (res.ok) return { ok: true, status: res.status, text: lastText };
    } catch (e) {
      lastText = e instanceof Error ? e.message : String(e);
      lastStatus = 0;
    }
  }

  return { ok: false, status: lastStatus, text: lastText };
}

export async function ipoRequestText(args: {
  host: string;
  auth: IpoAuth;
  path: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  allowInsecureTls?: boolean;
  headersOverride?: Record<string, string>;
  blockDeleteIfUserName?: string;
}): Promise<{ status: number; text: string; contentType: string | null }> {
  const base = normalizeBase(args.host);
  const url = `${base}${args.path.startsWith("/") ? "" : "/"}${args.path}`;
  const dispatcher = makeDispatcher(args.allowInsecureTls);

  const headers: Record<string, string> = {
    ...REQ_HEADERS,
    Cookie: args.auth.cookieHeader,
    ...(args.body ? { "Content-Type": "application/json" } : {}),
    ...(args.headersOverride ?? {}),
  };

  if (
    (args.method ?? "GET") === "DELETE" &&
    args.blockDeleteIfUserName?.toLowerCase() === "nouser"
  ) {
    throw new Error("Deletion is not allowed for NoUser.");
  }

  let res: Response | null = null;
  try {
    res = await fetch(url, {
      method: args.method ?? "GET",
      headers,
      body: args.body ? JSON.stringify(args.body) : undefined,
      // @ts-expect-error dispatcher supported by undici fetch
      dispatcher,
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    void logIpoRequest({
      method: args.method ?? "GET",
      url,
      body: args.body,
      ok: false,
      error: msg,
    });
    throw e;
  }

  const text = await readText(res);
  const responseText = formatResponseText(text);

  if (!res.ok) {
    void logIpoRequest({
      method: args.method ?? "GET",
      url,
      body: args.body,
      ok: false,
      status: res.status,
      responseText,
    });
    throw new Error(
      `IPO request failed (${res.status}): ${text || res.statusText}`,
    );
  }

  void logIpoRequest({
    method: args.method ?? "GET",
    url,
    body: args.body,
    ok: true,
    status: res.status,
    responseText,
  });

  return {
    status: res.status,
    text,
    contentType: res.headers.get("content-type"),
  };
}

/**
 * Convenience helper: authenticate -> run -> ALWAYS deauthenticate.
 */
export async function ipoWithSession<T>(args: {
  host: string;
  username: string;
  password: string;
  allowInsecureTls?: boolean;
  run: (auth: IpoAuth) => Promise<T>;
}): Promise<T> {
  const auth = await ipoAuthenticate({
    host: args.host,
    username: args.username,
    password: args.password,
    allowInsecureTls: args.allowInsecureTls,
  });

  try {
    return await args.run(auth);
  } finally {
    // best effort; don’t mask the real error
    void ipoDeauthenticate({
      host: args.host,
      auth,
      allowInsecureTls: args.allowInsecureTls,
    });
  }
}
