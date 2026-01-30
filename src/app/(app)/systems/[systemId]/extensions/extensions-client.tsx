"use client";

import * as React from "react";
import { ExtensionsTable } from "./extensions-table";
import { ExtensionDeleteDialog } from "./extension-delete-dialog";
import { ExtensionEditDrawer } from "./extension-edit-drawer";
import {
  CALLER_DISPLAY_LABELS,
  TYPE_INFO_LABELS,
  EMPTY_EXTENSION_EDIT_STATE,
  type ExtensionEditState,
  type ExtensionRow,
} from "./extensions-types";
import { ExtensionsToolbar } from "./extensions-toolbar";

const PAGE_SIZE = 25;

export default function ExtensionsClient({ systemId }: { systemId: string }) {
  const [rows, setRows] = React.useState<ExtensionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [editOpen, setEditOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [deleteRow, setDeleteRow] = React.useState<ExtensionRow | null>(null);
  const [editState, setEditState] = React.useState<ExtensionEditState>(
    EMPTY_EXTENSION_EDIT_STATE,
  );
  const [createState, setCreateState] = React.useState<ExtensionEditState>(
    EMPTY_EXTENSION_EDIT_STATE,
  );
  const [originalEditState, setOriginalEditState] =
    React.useState<ExtensionEditState>(EMPTY_EXTENSION_EDIT_STATE);

  const fetchExtensions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}/extensions`,
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
      setRows(json?.extensions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load extensions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [systemId]);

  React.useEffect(() => {
    void fetchExtensions();
  }, [fetchExtensions]);

  const typeOptions = React.useMemo(
    () =>
      Object.entries(TYPE_INFO_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const callerDisplayOptions = React.useMemo(
    () =>
      Object.entries(CALLER_DISPLAY_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      return (
        row.extension.toLowerCase().includes(q) ||
        row.typeInfo.toLowerCase().includes(q) ||
        row.module.toLowerCase().includes(q) ||
        row.port.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) =>
      a.extension.localeCompare(b.extension, undefined, { numeric: true }),
    );
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [search]);

  function renderTypeInfo(value: string) {
    return TYPE_INFO_LABELS[value] ?? value;
  }

  function renderCallerDisplay(value: string) {
    return CALLER_DISPLAY_LABELS[value] ?? value;
  }

  function openEdit(row: ExtensionRow) {
    const nextState: ExtensionEditState = {
      guid: row.guid,
      id: row.id,
      extension: row.extension,
      typeInfo: row.typeInfo,
      callerDisplayType: row.callerDisplayType,
      module: row.module,
      port: row.port,
      location: row.location,
    };
    setOriginalEditState(nextState);
    setEditState(nextState);
    setEditError(null);
    setEditOpen(true);
  }

  function openCreate() {
    setCreateState(EMPTY_EXTENSION_EDIT_STATE);
    setEditError(null);
    setCreateOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);

    if (!editState.guid) {
      setEditError("Missing extension GUID.");
      return;
    }

    if (!editState.extension.trim()) {
      setEditError("Extension is required.");
      return;
    }

    if (!editState.typeInfo) {
      setEditError("Type is required.");
      return;
    }

    const payload: Record<string, string> = { guid: editState.guid };

    const addIfChanged = (key: keyof ExtensionEditState) => {
      const next = editState[key];
      const prev = originalEditState[key];
      if (next === prev) return;
      if (!next) return;
      payload[key] = next;
    };

    addIfChanged("extension");
    addIfChanged("typeInfo");
    addIfChanged("callerDisplayType");
    addIfChanged("module");
    addIfChanged("port");
    addIfChanged("location");

    if (Object.keys(payload).length === 1) {
      setEditOpen(false);
      return;
    }

    setEditSaving(true);
    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}/extensions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error ?? "Failed to update extension.");
      }
      setEditOpen(false);
      await fetchExtensions();
    } catch (e) {
      setEditError(
        e instanceof Error ? e.message : "Failed to update extension.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);

    if (!createState.extension.trim()) {
      setEditError("Extension is required.");
      return;
    }

    if (!createState.typeInfo) {
      setEditError("Type is required.");
      return;
    }

    const payload: Record<string, string> = {};
    const addField = (key: keyof ExtensionEditState) => {
      const value = createState[key];
      if (!value) return;
      payload[key] = value;
    };

    addField("extension");
    addField("typeInfo");
    addField("callerDisplayType");
    addField("module");
    addField("port");
    addField("location");

    setEditSaving(true);
    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}/extensions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error ?? "Failed to add extension.");
      }
      setCreateOpen(false);
      await fetchExtensions();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to add extension.");
    } finally {
      setEditSaving(false);
    }
  }

  function requestDelete(row: ExtensionRow) {
    setDeleteRow(row);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteRow?.guid) {
      setDeleteOpen(false);
      return;
    }

    setDeleteBusy(true);
    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}/extensions`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guid: deleteRow.guid }),
        },
      );
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error ?? "Failed to delete extension.");
      }
      setDeleteOpen(false);
      await fetchExtensions();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to delete extension.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ExtensionsToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreate}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading extensions…</p>
      ) : error ? (
        <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      ) : pageRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No extensions found.</p>
      ) : (
        <>
          <ExtensionsTable
            rows={pageRows}
            renderTypeInfo={renderTypeInfo}
            renderCallerDisplay={renderCallerDisplay}
            onEdit={openEdit}
            onDelete={requestDelete}
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

      <ExtensionEditDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        saving={editSaving}
        error={editError}
        editState={editState}
        setEditState={setEditState}
        onSubmit={submitEdit}
        onCancel={() => setEditOpen(false)}
        typeOptions={typeOptions}
        callerDisplayOptions={callerDisplayOptions}
        showId
      />

      <ExtensionEditDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        saving={editSaving}
        error={editError}
        title="Add extension"
        description="Create a new extension on this system."
        submitLabel="Add"
        editState={createState}
        setEditState={setCreateState}
        onSubmit={submitCreate}
        onCancel={() => setCreateOpen(false)}
        typeOptions={typeOptions}
        callerDisplayOptions={callerDisplayOptions}
      />

      <ExtensionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        deleteBusy={deleteBusy}
        extensionValue={deleteRow?.extension ?? null}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
