import https from "node:https";

type IpoAuth = {
  cookieHeader: string; // "JSESSIONID=...; SDK-Token=...; ..."
};

const DEFAULT_HEADERS = {
  "X-User-Agent": "Avaya-SDKUser",
  "X-User-Client": "Avaya-WebAdmin",
  Accept: "application/json",
};

function basicAuth(username: string, password: string) {
  const raw = `${username}:${password}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

function normalizeBase(host: string) {
  // Your DB currently stores host (ip/fqdn). Management API is on :7070 + /WebManagement
  const h =
    host.startsWith("http://") || host.startsWith("https://")
      ? host
      : `https://${host}`;
  // Ensure we target the IPO WebManagement listener
  // If host already contains port/path, you can harden this later.
  return `${h.replace(/\/+$/, "")}:7070/WebManagement/ws/sdk`;
}

function extractCookieHeader(res: Response) {
  // Node 20+ fetch (undici) supports getSetCookie()
  const setCookies = (res.headers as any).getSetCookie?.() as
    | string[]
    | undefined;

  const cookies = (setCookies ?? [])
    .map((c) => c.split(";")[0]?.trim())
    .filter(Boolean);

  // Fallback: some environments only expose a combined set-cookie
  const combined = res.headers.get("set-cookie");
  if (cookies.length === 0 && combined) {
    // Best-effort split (not perfect, but usually OK for two cookies)
    combined.split(",").forEach((part) => {
      const trimmed = part.trim();
      if (
        trimmed.startsWith("JSESSIONID=") ||
        trimmed.startsWith("SDK-Token=")
      ) {
        cookies.push(trimmed.split(";")[0]!.trim());
      }
    });
  }

  if (cookies.length === 0) {
    throw new Error(
      "IPO auth did not return session cookies (Set-Cookie missing).",
    );
  }

  return cookies.join("; ");
}

export async function ipoAuthenticate(args: {
  host: string;
  username: string;
  password: string;
  // IPO often uses self-signed certs; allow opt-out for dev/on-prem
  allowInsecureTls?: boolean;
}): Promise<IpoAuth> {
  const base = normalizeBase(args.host);
  const url = `${base}/security/authenticate`;

  const agent = args.allowInsecureTls
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "application/json",
      Authorization: basicAuth(args.username, args.password),
    },
    // @ts-expect-error - Node fetch supports agent via undici dispatcher; Next may accept agent in node runtime.
    agent,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IPO authenticate failed (${res.status}): ${text || res.statusText}`,
    );
  }

  return { cookieHeader: extractCookieHeader(res) };
}

export async function ipoRequestJson<T>(args: {
  host: string;
  auth: IpoAuth;
  path: string; // e.g. "/admin/v1/users?ipaddress=10.0.0.10"
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  allowInsecureTls?: boolean;
}): Promise<T> {
  const base = normalizeBase(args.host);
  const url = `${base}${args.path.startsWith("/") ? "" : "/"}${args.path}`;

  const agent = args.allowInsecureTls
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  const res = await fetch(url, {
    method: args.method ?? "GET",
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "application/json",
      Cookie: args.auth.cookieHeader,
    },
    body: args.body ? JSON.stringify(args.body) : undefined,
    // @ts-expect-error see note above
    agent,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IPO request failed (${res.status}): ${text || res.statusText}`,
    );
  }

  return (await res.json()) as T;
}
