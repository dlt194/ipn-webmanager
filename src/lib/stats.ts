import { parseUsersAny } from "@/lib/ipo-parsers";

export type UserStats = {
  totalUsers: number;
  licensedCount: number;
  packageCounts: Record<string, number>;
};

export function computeUserStats(raw: string): UserStats {
  const parsed = parseUsersAny(raw);
  const packageCounts: Record<string, number> = {};
  let licensedCount = 0;

  for (const user of parsed.users) {
    const pkg = (user.assignedPackage ?? "").trim();
    if (pkg) {
      packageCounts[pkg] = (packageCounts[pkg] ?? 0) + 1;
      if (pkg !== "8") licensedCount += 1;
    }
  }

  return {
    totalUsers: parsed.users.length,
    licensedCount,
    packageCounts,
  };
}
