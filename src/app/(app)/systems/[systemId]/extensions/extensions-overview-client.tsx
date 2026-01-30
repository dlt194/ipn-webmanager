"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { PieChartInteractive } from "@/components/charts/pie-chart";
import { TYPE_INFO_LABELS, type ExtensionRow } from "./extensions-types";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#60a5fa",
  "#a78bfa",
  "#f59e0b",
  "#34d399",
];

export function ExtensionsOverviewClient(props: { systemId: string }) {
  const [rows, setRows] = React.useState<ExtensionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/server-configs/${encodeURIComponent(props.systemId)}/extensions`,
          { cache: "no-store" },
        );
        const json = (await res.json().catch(() => null)) as
          | { extensions?: ExtensionRow[]; error?: string }
          | null;
        if (!res.ok) {
          throw new Error(
            json?.error
              ? `Failed to load extensions: ${json.error}`
              : `Failed to load extensions (${res.status})`,
          );
        }
        if (active) setRows(json?.extensions ?? []);
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Failed to load extensions",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [props.systemId]);

  const total = rows.length;

  const breakdown = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.typeInfo?.trim() || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).filter(([, count]) => count > 0);
  }, [rows]);

  const data = breakdown.map(([key, count], index) => ({
    name: TYPE_INFO_LABELS[key] ?? key,
    value: count,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="p-4">
      <div>
        <h2 className="text-sm font-medium">Extension Overview</h2>
        <p className="text-xs text-muted-foreground">
          Breakdown by extension type.
        </p>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-600 whitespace-pre-wrap">{error}</div>
        ) : (
          <>
            <div className="rounded border p-3">
              <div className="text-xs text-muted-foreground">
                Total Extensions
              </div>
              <div className="text-lg font-semibold">{total}</div>
            </div>

            <div className="mt-3 flex items-center gap-4">
              {data.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data</div>
              ) : (
                <PieChartInteractive
                  data={data}
                  ariaLabel="Extension breakdown"
                />
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
