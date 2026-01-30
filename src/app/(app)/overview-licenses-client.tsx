"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { PieChartInteractive } from "@/components/charts/pie-chart";

type LicenseRow = {
  licenseKey: string;
  quantity: string;
};

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

function parseQuantity(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function OverviewLicensesClient(props: { systemIds: string[] }) {
  const [rows, setRows] = React.useState<LicenseRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          props.systemIds.map(async (id) => {
            const res = await fetch(
              `/api/server-configs/${encodeURIComponent(id)}/licenses`,
              { cache: "no-store" },
            );
            const json = (await res.json().catch(() => null)) as
              | { licenses?: LicenseRow[]; error?: string }
              | null;
            if (!res.ok) {
              throw new Error(
                json?.error
                  ? `Failed to load licenses: ${json.error}`
                  : `Failed to load licenses (${res.status})`,
              );
            }
            return json?.licenses ?? [];
          }),
        );
        if (!active) return;
        setRows(results.flat());
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Failed to load licenses");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (props.systemIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    void load();
    return () => {
      active = false;
    };
  }, [props.systemIds]);

  const totalQuantity = React.useMemo(
    () => rows.reduce((sum, row) => sum + parseQuantity(row.quantity), 0),
    [rows],
  );

  const breakdown = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.licenseKey?.trim() || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + parseQuantity(row.quantity));
    }
    return Array.from(counts.entries()).filter(([, count]) => count > 0);
  }, [rows]);

  const data = breakdown.map(([key, count], index) => ({
    name: key,
    value: count,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="p-4">
      <div>
        <h2 className="text-sm font-medium">License Overview</h2>
        <p className="text-xs text-muted-foreground">
          Combined breakdown by license key using quantity totals.
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
              <div className="text-xs text-muted-foreground">Total Quantity</div>
              <div className="text-lg font-semibold">{totalQuantity}</div>
            </div>

            <div className="mt-3 flex items-center gap-4">
              {data.length === 0 ? (
                <div className="text-sm text-muted-foreground">No data</div>
              ) : (
                <PieChartInteractive data={data} ariaLabel="License breakdown" />
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
