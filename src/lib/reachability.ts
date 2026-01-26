export type Reachability = "green" | "amber" | "red";

export function resolveReachability(
  server: boolean,
  client: boolean,
): Reachability {
  if (server && client) return "green";
  if (server || client) return "amber";
  return "red";
}

export function normalizeHostForClient(host: string) {
  // for client HTTP checks (best effort)
  if (host.startsWith("http://") || host.startsWith("https://")) return host;
  return `https://${host}`;
}

export async function clientHttpCheck(
  url: string,
  timeoutMs = 2500,
): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(url, {
      method: "GET",
      cache: "no-store",
      mode: "no-cors",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
