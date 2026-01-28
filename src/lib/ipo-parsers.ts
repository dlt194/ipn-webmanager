export type IpoUserRow = {
  guid: string;
  name: string;
  fullName: string;
  extension: string;
  assignedPackage: string;
  [key: string]: string;
};

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

const OMIT_USER_FIELDS = new Set([
  "ExpansionType",
  "PhoneType",
  "SpecificBstType",
]);

type IpoUserLike = {
  "@GUID"?: unknown;
  GUID?: unknown;
  Name?: unknown;
  FullName?: unknown;
  Extension?: unknown;
  AssignedPackage?: unknown;
};

// Minimal XML fallback (only if you still sometimes get XML)
// If you *never* get XML, you can drop this and simplify.
function parseUsersXmlFallback(xml: string): IpoUserRow[] {
  // super-lightweight extraction without DOM libs:
  // matches: <User GUID="..."> ... <Name>...</Name> <FullName>...</FullName> <Extension>...</Extension> <AssignedPackage>...</AssignedPackage>
  const users: IpoUserRow[] = [];
  const userBlocks = xml.match(/<User\b[\s\S]*?<\/User>/g) ?? [];

  for (const blk of userBlocks) {
    const guid = (blk.match(/\bGUID="([^"]+)"/)?.[1] ?? "").trim();
    const name = (blk.match(/<Name>([\s\S]*?)<\/Name>/)?.[1] ?? "").trim();
    const fullName = (
      blk.match(/<FullName>([\s\S]*?)<\/FullName>/)?.[1] ?? ""
    ).trim();
    const extension = (
      blk.match(/<Extension>([\s\S]*?)<\/Extension>/)?.[1] ?? ""
    ).trim();
    const assignedPackage = (
      blk.match(/<AssignedPackage>([\s\S]*?)<\/AssignedPackage>/)?.[1] ?? ""
    ).trim();

    if (guid || name) {
      users.push({ guid, name, fullName, extension, assignedPackage });
    }
  }

  return users;
}

export function parseUsersAny(text: string): {
  users: IpoUserRow[];
  format: "json" | "xml" | "unknown";
} {
  const j = tryParseJson(text);

  // JSON envelope like your “Raw Response”
  if (j && typeof j === "object") {
    const resp = asRecord(j)?.response;
    const respRec = asRecord(resp);
    const status = asString(respRec?.["@status"] ?? respRec?.status);

    if (status === "1") {
      const dataRec = asRecord(respRec?.data);
      const ws = dataRec?.ws_object;
      const arr = Array.isArray(ws) ? ws : ws ? [ws] : [];

      const users: IpoUserRow[] = arr
        .map((item) => asRecord(item)?.User)
        .map((user) => asRecord(user))
        .filter((u): u is Record<string, unknown> => u !== null)
        .map((u) => {
          const normalized: Record<string, string> = {};
          for (const [key, value] of Object.entries(u)) {
            if (OMIT_USER_FIELDS.has(key)) continue;
            normalized[key] = asString(value);
          }

          const typed = u as IpoUserLike;
          const guid = asString(typed["@GUID"] ?? typed.GUID ?? normalized["@GUID"] ?? normalized.GUID);
          const name = asString(typed.Name ?? normalized.Name);
          const fullName = asString(typed.FullName ?? normalized.FullName);
          const extension = asString(typed.Extension ?? normalized.Extension);
          const assignedPackage = asString(
            typed.AssignedPackage ?? normalized.AssignedPackage,
          );

          return {
            guid,
            name,
            fullName,
            extension,
            assignedPackage,
            ...normalized,
          };
        });

      return { users, format: "json" };
    }

    // status=0 API-level error (still HTTP 200 sometimes)
    if (status === "0") {
      return { users: [], format: "json" };
    }
  }

  // XML envelope fallback
  if (text.trim().startsWith("<")) {
    return { users: parseUsersXmlFallback(text), format: "xml" };
  }

  return { users: [], format: "unknown" };
}
