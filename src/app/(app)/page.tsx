import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OverviewLicensesClient } from "./overview-licenses-client";
import { OverviewExtensionsClient } from "./overview-extensions-client";
import { PieChartInteractive } from "@/components/charts/pie-chart";
const PACKAGE_LABELS: Record<string, string> = {
  "1": "Basic",
  "2": "Teleworker",
  "3": "Mobile",
  "4": "Power",
  "5": "OfficeWorker",
  "6": "BranchUser",
  "7": "CentralizedUser",
  "8": "NonLicensed",
};

const PACKAGE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#60a5fa",
  "#a78bfa",
  "#f59e0b",
];

export default async function AppHome() {
  const session = await getServerSession(authOptions);
  const owner = session?.oid ?? session?.upn ?? session?.user?.email ?? null;
  if (!owner) redirect("/login");

  const systems = await prisma.serverConfig.findMany({
    where: { ownerUpn: owner },
    select: {
      id: true,
      name: true,
      host: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const baselines = await prisma.serverStatsBaseline.findMany({
    where: { ownerUpn: owner },
    select: {
      serverConfigId: true,
      totalUsers: true,
      licensedCount: true,
      lastSyncedAt: true,
      statsJson: true,
    },
  });

  const totals = baselines.reduce(
    (acc, b) => {
      acc.totalUsers += b.totalUsers;
      acc.licensedCount += b.licensedCount;
      acc.lastSyncedAt = acc.lastSyncedAt
        ? new Date(
            Math.max(acc.lastSyncedAt.getTime(), b.lastSyncedAt.getTime()),
          )
        : b.lastSyncedAt;

      const statsJson = b.statsJson as { packageCounts?: Record<string, number> };
      const pkgCounts = statsJson?.packageCounts ?? {};
      for (const [pkg, count] of Object.entries(pkgCounts)) {
        acc.packageCounts[pkg] = (acc.packageCounts[pkg] ?? 0) + count;
      }

      return acc;
    },
    {
      totalUsers: 0,
      licensedCount: 0,
      lastSyncedAt: null as Date | null,
      packageCounts: {} as Record<string, number>,
    },
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Combined cached stats across all systems.
        </p>
      </div>

      {systems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No systems yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded border p-4">
            <h2 className="text-sm font-medium">All Systems Overview</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded border p-3">
                <div className="text-xs text-muted-foreground">Total Users</div>
                <div className="text-lg font-semibold">
                  {totals.totalUsers}
                </div>
              </div>
              <div className="rounded border p-3">
                <div className="text-xs text-muted-foreground">
                  Users by Package
                </div>
                {(() => {
                  const entries = Object.entries(totals.packageCounts).filter(
                    ([, count]) => count > 0,
                  );
                  const total = entries.reduce((sum, [, count]) => sum + count, 0);
                  if (total === 0) {
                    return (
                      <div className="mt-2 text-sm text-muted-foreground">
                        No data
                      </div>
                    );
                  }

                  const data = entries.map(([pkg, count], index) => ({
                    name: PACKAGE_LABELS[pkg] ?? pkg,
                    value: count,
                    color: PACKAGE_COLORS[index % PACKAGE_COLORS.length],
                  }));

                  return (
                    <div className="mt-2 flex items-center gap-4">
                      <PieChartInteractive
                        data={data}
                        ariaLabel="Package breakdown"
                      />
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Last synced: {totals.lastSyncedAt?.toISOString() ?? "—"}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OverviewLicensesClient systemIds={systems.map((s) => s.id)} />
            <OverviewExtensionsClient systemIds={systems.map((s) => s.id)} />
          </div>
        </div>
      )}
    </div>
  );
}
