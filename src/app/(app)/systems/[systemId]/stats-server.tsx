import { prisma } from "@/lib/prisma";
import { StatsClient } from "./stats-client";

export async function StatsServer(props: {
  systemId: string;
  owner: string;
}) {
  const baseline = await prisma.serverStatsBaseline.findUnique({
    where: {
      serverConfigId_ownerUpn: {
        serverConfigId: props.systemId,
        ownerUpn: props.owner,
      },
    },
  });

  return (
    <StatsClient
      systemId={props.systemId}
      initial={
        baseline
          ? {
              totalUsers: baseline.totalUsers,
              licensedCount: baseline.licensedCount,
              packageCounts:
                (baseline.statsJson as { packageCounts?: Record<string, number> })
                  ?.packageCounts ?? {},
              lastSyncedAt: baseline.lastSyncedAt.toISOString(),
            }
          : null
      }
    />
  );
}
