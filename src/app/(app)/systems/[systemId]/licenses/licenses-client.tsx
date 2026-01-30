"use client";

import * as React from "react";
import { LicensesTable } from "./licenses-table";
import {
  MODE_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  type LicenseRow,
} from "./licenses-types";
import { LicensesToolbar } from "./licenses-toolbar";

const PAGE_SIZE = 25;

export default function LicensesClient({ systemId }: { systemId: string }) {
  const [rows, setRows] = React.useState<LicenseRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  const fetchLicenses = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}/licenses`,
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
      setRows(json?.licenses ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load licenses");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  React.useEffect(() => {
    void fetchLicenses();
  }, [fetchLicenses]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      return (
        row.licenseKey.toLowerCase().includes(q) ||
        row.displayName.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        row.source.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { numeric: true }),
    );
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  function renderSource(value: string) {
    return SOURCE_LABELS[value] ?? value;
  }

  function renderStatus(value: string) {
    return STATUS_LABELS[value] ?? value;
  }

  function renderMode(value: string) {
    return MODE_LABELS[value] ?? value;
  }

  return (
    <div className="space-y-4">
      <LicensesToolbar search={search} onSearchChange={setSearch} />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading licenses…</p>
      ) : error ? (
        <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      ) : pageRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No licenses found.</p>
      ) : (
        <>
          <LicensesTable
            rows={pageRows}
            renderSource={renderSource}
            renderStatus={renderStatus}
            renderMode={renderMode}
          />

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
