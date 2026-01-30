"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import * as React from "react";
import { PieChartInteractive } from "@/components/charts/pie-chart";

type Baseline = {
  totalUsers: number;
  licensedCount: number;
  packageCounts?: Record<string, number>;
  lastSyncedAt: string;
} | null;

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

export function StatsClient(props: {
  systemId: string;
  initial: Baseline;
}) {
  const [baseline, setBaseline] = React.useState<Baseline>(props.initial);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(props.systemId)}/stats`,
        { method: "POST" },
      );
      const json = (await res.json().catch(() => null)) as
        | { baseline?: Baseline; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to refresh stats.");
      }
      setBaseline(json?.baseline ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh stats.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">System Stats</h2>
          <p className="text-xs text-muted-foreground">
            Baseline cache stored in the database.
          </p>
        </div>
        <Button size="sm" onClick={refresh} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded border p-3">
          <div className="text-xs text-muted-foreground">Total Users</div>
          <div className="text-lg font-semibold">
            {baseline?.totalUsers ?? "—"}
          </div>
        </div>
        <div className="rounded border p-3">
          <div className="text-xs text-muted-foreground">
            Users by Package
          </div>
          {baseline ? (
            <div className="mt-2 flex items-center gap-4">
              {(() => {
                const counts = baseline.packageCounts ?? {};
                const entries = Object.entries(counts).filter(
                  ([, count]) => typeof count === "number" && count > 0,
                );
                const total = entries.reduce((sum, [, count]) => sum + count, 0);

                if (total === 0) {
                  return (
                    <div className="text-sm text-muted-foreground">No data</div>
                  );
                }

                const data = entries.map(([pkg, count], index) => ({
                  name: PACKAGE_LABELS[pkg] ?? pkg,
                  value: count,
                  color: PACKAGE_COLORS[index % PACKAGE_COLORS.length],
                }));

                return (
                  <PieChartInteractive data={data} ariaLabel="Package breakdown" />
                );
              })()}
            </div>
          ) : (
            <div className="mt-2 text-lg font-semibold">—</div>
          )}
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Last synced: {baseline?.lastSyncedAt ?? "—"}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      ) : null}
    </Card>
  );
}
