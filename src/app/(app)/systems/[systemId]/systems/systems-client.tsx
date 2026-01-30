"use client";

import * as React from "react";
import { SystemsTable } from "./systems-table";
import type { SystemRow } from "./systems-types";
import { SystemsToolbar } from "./systems-toolbar";

const PAGE_SIZE = 25;

export default function SystemsClient({ systemId }: { systemId: string }) {
  const [rows, setRows] = React.useState<SystemRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const fetchSystems = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}/systems`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as
        | { systems?: SystemRow[]; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(
          json?.error
            ? `Failed to load systems: ${json.error}`
            : `Failed to load systems (${res.status})`,
        );
      }
      setRows(json?.systems ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load systems");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  React.useEffect(() => {
    void fetchSystems();
  }, [fetchSystems]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.version.toLowerCase().includes(q) ||
        row.lan1IpAddress.toLowerCase().includes(q) ||
        row.lan2IpAddress.toLowerCase().includes(q) ||
        row.voicemailType.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    );
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="space-y-4">
      <SystemsToolbar search={search} onSearchChange={setSearch} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading systems…</p>
      ) : error ? (
        <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      ) : pageRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No systems found.</p>
      ) : (
        <>
          <SystemsTable rows={pageRows} />

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {start + 1}-{Math.min(start + PAGE_SIZE, sorted.length)}{" "}
              of {sorted.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded border px-2 py-1 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={clampedPage <= 1}
              >
                Previous
              </button>
              <span>
                Page {clampedPage} of {totalPages}
              </span>
              <button
                type="button"
                className="rounded border px-2 py-1 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={clampedPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
