import type { Session } from "next-auth";

function normalizeOwner(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve a stable owner identifier from the session.
 * Prefer Entra object id (oid), then UPN, then email.
 */
export function resolveOwner(session: Session | null | undefined): string | null {
  return (
    normalizeOwner(session?.oid) ??
    normalizeOwner(session?.upn) ??
    normalizeOwner(session?.user?.email) ??
    null
  );
}

