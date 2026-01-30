"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import * as React from "react";
import {
  EMPTY_EDIT_STATE,
  PACKAGE_MAP,
  type Row,
  type UserEditState,
} from "./users-types";
import {
  type SortDir,
  type SortKey,
  UsersTable,
} from "./users-table";
import { UsersToolbar } from "./users-toolbar";
import { UserDeleteDialog } from "./user-delete-dialog";
import { UserEditDrawer } from "./user-edit-drawer";

type ApiOk = {
  users: Row[];
  raw?: string;
  meta?: Record<string, unknown>;
};

type ApiErr = { error?: string };

function compare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export default function UsersClient({ systemId }: { systemId: string }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [pageSize] = React.useState(25);
  const [page, setPage] = React.useState(1);

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await fetch(
      `/api/server-configs/${encodeURIComponent(systemId)}/users?debug=1`,
      { cache: "no-store" },
    );

    const text = await res.text();
    const ct = res.headers.get("content-type") ?? "";

    if (!ct.includes("application/json")) {
      throw new Error(
        `Unexpected content-type from API: ${ct}\n${text.slice(0, 400)}`,
      );
    }

    const json = JSON.parse(text) as ApiOk & ApiErr;

    if (!res.ok) {
      throw new Error(json.error ?? `Request failed (${res.status})`);
    }

    setRows(json.users ?? []);
  }, [systemId]);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await fetchUsers();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load users");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchUsers]);

  const sorted = React.useMemo(() => {
    const copy = [...rows];

    copy.sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      const cmp = compare(av, bv);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    setSortKey((prevKey) => {
      if (prevKey !== key) {
        setSortDir("asc");
        return key;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prevKey;
    });
  }

  function renderPackageLabel(v: string) {
    const n = Number(v);
    if (Number.isFinite(n) && PACKAGE_MAP[n]) return `${PACKAGE_MAP[n]}`;
    return v || "";
  }

  const packageOptions = React.useMemo(
    () =>
      Object.entries(PACKAGE_MAP)
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => Number(a.value) - Number(b.value)),
    [],
  );

  const PACKAGE_BASIC = "1";
  const PACKAGE_POWER = "4";
  const PACKAGE_OFFICE_WORKER = "5";

  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<Row | null>(null);
  const [editState, setEditState] =
    React.useState<UserEditState>(EMPTY_EDIT_STATE);
  const [originalEditState, setOriginalEditState] =
    React.useState<UserEditState>(EMPTY_EDIT_STATE);
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [confirmLoginCode, setConfirmLoginCode] = React.useState("");
  const [confirmVoicemailCode, setConfirmVoicemailCode] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showLoginCode, setShowLoginCode] = React.useState(false);
  const [showVoicemailCode, setShowVoicemailCode] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editSaving, setEditSaving] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createState, setCreateState] = React.useState<UserEditState>({
    ...EMPTY_EDIT_STATE,
    assignedPackage: "1",
  });
  const [createConfirmPassword, setCreateConfirmPassword] =
    React.useState("");
  const [createConfirmLoginCode, setCreateConfirmLoginCode] =
    React.useState("");
  const [createConfirmVoicemailCode, setCreateConfirmVoicemailCode] =
    React.useState("");
  const [createShowPassword, setCreateShowPassword] = React.useState(false);
  const [createShowLoginCode, setCreateShowLoginCode] = React.useState(false);
  const [createShowVoicemailCode, setCreateShowVoicemailCode] =
    React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createSaving, setCreateSaving] = React.useState(false);

  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.fullName.toLowerCase().includes(q) ||
        row.extension.toLowerCase().includes(q)
      );
    });
  }, [search, sorted]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paged = React.useMemo(() => {
    const safePage = Math.min(Math.max(1, page), pageCount);
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageCount, pageSize]);

  React.useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir, pageSize, systemId]);

  React.useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteRow, setDeleteRow] = React.useState<Row | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  function startEdit(row: Row) {
    const getAnyField = (keys: string[]) =>
      keys.map((k) => row[k]).find((v) => typeof v === "string") ?? "";

    setEditRow(row);
    const nextState: UserEditState = {
      ...EMPTY_EDIT_STATE,
      name: getAnyField(["name", "Name"]),
      fullName: getAnyField(["fullName", "FullName"]),
      extension: getAnyField(["extension", "Extension"]),
      assignedPackage: getAnyField(["assignedPackage", "AssignedPackage"]),
      canIntrude: getAnyField(["CanIntrude", "canIntrude"]) || "false",
      cannotBeIntruded:
        getAnyField(["CannotBeIntruded", "cannotBeIntruded"]) || "false",
      dndExceptions: getAnyField(["DNDExceptions", "dndExceptions"]),
      doNotDisturb: getAnyField(["DoNotDisturb", "doNotDisturb"]) || "false",
      expansionType: getAnyField(["ExpansionType", "expansionType"]),
      flareEnabled: getAnyField(["FlareEnabled", "flareEnabled"]) || "false",
      flare: getAnyField(["Flare", "flare"]) || "false",
      forceAccountCode:
        getAnyField(["ForceAccountCode", "forceAccountCode"]) || "false",
      idleLinePreference:
        getAnyField(["IdleLinePreference", "idleLinePreference"]) || "false",
      loginCode: getAnyField(["LoginCode", "loginCode"]),
      mobilityFeatures:
        getAnyField(["MobilityFeatures", "mobilityFeatures"]) || "false",
      oneXClient: getAnyField(["OneXClient", "oneXClient"]) || "false",
      oneXTelecommuter:
        getAnyField(["OneXTelecommuter", "oneXTelecommuter"]) || "false",
      outgoingCallBar:
        getAnyField(["OutgoingCallBar", "outgoingCallBar"]) || "false",
      outOfHoursUserRights: getAnyField([
        "OutOfHoursUserRights",
        "outOfHoursUserRights",
      ]),
      userRightsTimeProfile: getAnyField([
        "UserRightsTimeProfile",
        "userRightsTimeProfile",
      ]),
      password: "",
      phoneType: getAnyField(["PhoneType", "phoneType"]),
      priority: getAnyField(["Priority", "priority"]),
      receptionist:
        getAnyField(["Receptionist", "receptionist"]) || "false",
      remoteWorker: getAnyField(["RemoteWorker", "remoteWorker"]) || "false",
      sipContact: getAnyField(["SIPContact", "sipContact"]),
      sipName: getAnyField(["SIPName", "sipName"]),
      specificBstType: getAnyField(["SpecificBstType", "specificBstType"]),
      twinningType: getAnyField(["TwinningType", "twinningType"]),
      umsWebServices:
        getAnyField(["UMSWebServices", "umsWebServices"]) || "false",
      userRights: getAnyField(["UserRights", "userRights"]),
      voicemailCode: getAnyField(["VoicemailCode", "voicemailCode"]),
      voicemailEmail: getAnyField(["VoicemailEmail", "voicemailEmail"]),
      voicemailOn: getAnyField(["VoicemailOn", "voicemailOn"]) || "false",
      webCollaboration:
        getAnyField(["WebCollaboration", "webCollaboration"]) || "false",
      xDirectory: getAnyField(["XDirectory", "xDirectory"]) || "false",
    };
    setEditState(nextState);
    setOriginalEditState(nextState);
    setConfirmPassword("");
    setConfirmLoginCode(getAnyField(["LoginCode", "loginCode"]));
    setConfirmVoicemailCode(getAnyField(["VoicemailCode", "voicemailCode"]));
    setShowPassword(false);
    setShowLoginCode(false);
    setShowVoicemailCode(false);
    setEditError(null);
    setEditOpen(true);
  }

  function startDelete(row: Row) {
    setDeleteRow(row);
    setDeleteError(null);
    setDeleteOpen(true);
  }

  function closeEdit() {
    if (editSaving) return;
    setEditOpen(false);
  }

  function startCreate() {
    setCreateState({ ...EMPTY_EDIT_STATE, assignedPackage: "1" });
    setCreateConfirmPassword("");
    setCreateConfirmLoginCode("");
    setCreateConfirmVoicemailCode("");
    setCreateShowPassword(false);
    setCreateShowLoginCode(false);
    setCreateShowVoicemailCode(false);
    setCreateError(null);
    setCreateOpen(true);
  }

  function closeCreate() {
    if (createSaving) return;
    setCreateOpen(false);
  }

  function applyPackageRules(
    nextPackage: string,
    prev: UserEditState,
  ): UserEditState {
    if (nextPackage === PACKAGE_POWER) {
      return {
        ...prev,
        assignedPackage: nextPackage,
        flareEnabled: "true",
        oneXClient: "true",
        oneXTelecommuter: "true",
        remoteWorker: "true",
        flare: "true",
        webCollaboration: "true",
      };
    }

    if (nextPackage === PACKAGE_BASIC) {
      return {
        ...prev,
        assignedPackage: nextPackage,
        flareEnabled: "false",
        oneXClient: "false",
        oneXTelecommuter: "false",
        remoteWorker: "false",
        flare: "false",
        mobilityFeatures: "false",
        webCollaboration: "false",
        receptionist: "false",
      };
    }

    if (nextPackage === PACKAGE_OFFICE_WORKER) {
      return {
        ...prev,
        assignedPackage: nextPackage,
        flareEnabled: "true",
        oneXClient: "false",
        oneXTelecommuter: "false",
        remoteWorker: "false",
        flare: "true",
        mobilityFeatures: "false",
        webCollaboration: "false",
      };
    }

    return { ...prev, assignedPackage: nextPackage };
  }

  function isFeatureDisabled(packageValue: string, key: string) {
    if (packageValue === PACKAGE_BASIC) {
      return key !== "receptionist" && key !== "remoteWorker";
    }
    if (packageValue === PACKAGE_OFFICE_WORKER) {
      return (
        key !== "receptionist" &&
        key !== "remoteWorker" &&
        key !== "flare"
      );
    }
    return false;
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;

    if (editState.password && editState.password !== confirmPassword) {
      setEditError("Password confirmation does not match.");
      return;
    }

    if (editState.loginCode && editState.loginCode !== confirmLoginCode) {
      setEditError("Login code confirmation does not match.");
      return;
    }

    if (
      editState.voicemailCode &&
      editState.voicemailCode !== confirmVoicemailCode
    ) {
      setEditError("Voicemail code confirmation does not match.");
      return;
    }

    setEditSaving(true);
    setEditError(null);

    const payload: Record<string, string> = { guid: editRow.guid };
    const addIfChanged = (
      key: keyof UserEditState,
      value: string,
      original: string,
      normalize = false,
    ) => {
      const nextVal = normalize ? value.trim() : value;
      const prevVal = normalize ? original.trim() : original;
      if (nextVal !== prevVal) payload[key] = nextVal;
    };

    addIfChanged("name", editState.name, originalEditState.name, true);
    addIfChanged("fullName", editState.fullName, originalEditState.fullName, true);
    addIfChanged("extension", editState.extension, originalEditState.extension, true);
    addIfChanged(
      "assignedPackage",
      editState.assignedPackage,
      originalEditState.assignedPackage,
    );
    addIfChanged("canIntrude", editState.canIntrude, originalEditState.canIntrude);
    addIfChanged(
      "cannotBeIntruded",
      editState.cannotBeIntruded,
      originalEditState.cannotBeIntruded,
    );
    addIfChanged(
      "dndExceptions",
      editState.dndExceptions,
      originalEditState.dndExceptions,
      true,
    );
    addIfChanged(
      "doNotDisturb",
      editState.doNotDisturb,
      originalEditState.doNotDisturb,
    );
    addIfChanged(
      "flareEnabled",
      editState.flareEnabled,
      originalEditState.flareEnabled,
    );
    addIfChanged("flare", editState.flare, originalEditState.flare);
    addIfChanged(
      "forceAccountCode",
      editState.forceAccountCode,
      originalEditState.forceAccountCode,
    );
    addIfChanged(
      "idleLinePreference",
      editState.idleLinePreference,
      originalEditState.idleLinePreference,
    );
    addIfChanged("loginCode", editState.loginCode, originalEditState.loginCode);
    addIfChanged(
      "mobilityFeatures",
      editState.mobilityFeatures,
      originalEditState.mobilityFeatures,
    );
    addIfChanged("oneXClient", editState.oneXClient, originalEditState.oneXClient);
    addIfChanged(
      "oneXTelecommuter",
      editState.oneXTelecommuter,
      originalEditState.oneXTelecommuter,
    );
    addIfChanged(
      "outgoingCallBar",
      editState.outgoingCallBar,
      originalEditState.outgoingCallBar,
    );
    addIfChanged(
      "outOfHoursUserRights",
      editState.outOfHoursUserRights,
      originalEditState.outOfHoursUserRights,
      true,
    );
    addIfChanged(
      "userRightsTimeProfile",
      editState.userRightsTimeProfile,
      originalEditState.userRightsTimeProfile,
      true,
    );
    addIfChanged("priority", editState.priority, originalEditState.priority);
    addIfChanged(
      "receptionist",
      editState.receptionist,
      originalEditState.receptionist,
    );
    addIfChanged(
      "remoteWorker",
      editState.remoteWorker,
      originalEditState.remoteWorker,
    );
    addIfChanged("sipContact", editState.sipContact, originalEditState.sipContact);
    addIfChanged("sipName", editState.sipName, originalEditState.sipName);
    addIfChanged(
      "twinningType",
      editState.twinningType,
      originalEditState.twinningType,
    );
    addIfChanged(
      "umsWebServices",
      editState.umsWebServices,
      originalEditState.umsWebServices,
    );
    addIfChanged("userRights", editState.userRights, originalEditState.userRights);
    addIfChanged(
      "voicemailCode",
      editState.voicemailCode,
      originalEditState.voicemailCode,
    );
    addIfChanged(
      "voicemailEmail",
      editState.voicemailEmail,
      originalEditState.voicemailEmail,
      true,
    );
    addIfChanged(
      "voicemailOn",
      editState.voicemailOn,
      originalEditState.voicemailOn,
    );
    addIfChanged(
      "webCollaboration",
      editState.webCollaboration,
      originalEditState.webCollaboration,
    );
    addIfChanged("xDirectory", editState.xDirectory, originalEditState.xDirectory);

    if (editState.password.trim().length > 0) {
      payload.password = editState.password;
    }

    if (Object.keys(payload).length === 1) {
      setEditError("No changes to save.");
      setEditSaving(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}/users`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
        },
      );

      const json = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.error ?? `Update failed (${res.status})`);
      }

      setRows((prev) =>
        prev.map((r) =>
          r.guid === editRow.guid
            ? {
                ...r,
                name: payload.name,
                fullName: payload.fullName,
                extension: payload.extension,
                assignedPackage: payload.assignedPackage,
              }
            : r,
        ),
      );

      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditSaving(false);
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();

    const name = createState.name.trim();
    const extension = createState.extension.trim();
    const assignedPackage = createState.assignedPackage.trim();
    const password = createState.password;

    if (!name || !extension || !assignedPackage || !password) {
      setCreateError(
        "name, extension, assignedPackage, and password are required.",
      );
      return;
    }

    if (password !== createConfirmPassword) {
      setCreateError("Password confirmation does not match.");
      return;
    }

    if (
      createState.loginCode &&
      createState.loginCode !== createConfirmLoginCode
    ) {
      setCreateError("Login code confirmation does not match.");
      return;
    }

    if (
      createState.voicemailCode &&
      createState.voicemailCode !== createConfirmVoicemailCode
    ) {
      setCreateError("Voicemail code confirmation does not match.");
      return;
    }

    setCreateSaving(true);
    setCreateError(null);

    const payload = {
      name,
      fullName: createState.fullName.trim(),
      extension,
      assignedPackage,
      canIntrude: createState.canIntrude,
      cannotBeIntruded: createState.cannotBeIntruded,
      dndExceptions: createState.dndExceptions,
      doNotDisturb: createState.doNotDisturb,
      flareEnabled: createState.flareEnabled,
      flare: createState.flare,
      forceAccountCode: createState.forceAccountCode,
      idleLinePreference: createState.idleLinePreference,
      loginCode: createState.loginCode,
      mobilityFeatures: createState.mobilityFeatures,
      oneXClient: createState.oneXClient,
      oneXTelecommuter: createState.oneXTelecommuter,
      outgoingCallBar: createState.outgoingCallBar,
      outOfHoursUserRights: createState.outOfHoursUserRights,
      userRightsTimeProfile: createState.userRightsTimeProfile,
      password,
      priority: createState.priority,
      receptionist: createState.receptionist,
      remoteWorker: createState.remoteWorker,
      sipContact: createState.sipContact,
      sipName: createState.sipName,
      twinningType: createState.twinningType,
      umsWebServices: createState.umsWebServices,
      userRights: createState.userRights,
      voicemailCode: createState.voicemailCode,
      voicemailEmail: createState.voicemailEmail,
      voicemailOn: createState.voicemailOn,
      webCollaboration: createState.webCollaboration,
      xDirectory: createState.xDirectory,
    };

    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}/users`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
        },
      );

      const json = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.error ?? `Create failed (${res.status})`);
      }

      await fetchUsers();
      setCreateOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create user.",
      );
    } finally {
      setCreateSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return;

    setDeleteBusy(true);
    setDeleteError(null);

    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}/users`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ guid: deleteRow.guid, name: deleteRow.name }),
        },
      );

      const json = (await res.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(json?.error ?? `Delete failed (${res.status})`);
      }

      setRows((prev) => prev.filter((r) => r.guid !== deleteRow.guid));
      setDeleteOpen(false);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete user",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="p-6">
      <UsersToolbar
        search={search}
        onSearchChange={setSearch}
        onAdd={startCreate}
      />

      <Card className="p-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <UsersTable
            rows={paged}
            sortKey={sortKey}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            onEdit={startEdit}
            onDelete={startDelete}
            renderPackageLabel={renderPackageLabel}
          />
        )}

        {filtered.length > 0 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}-
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded border px-2 py-1 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span>
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                className="rounded border px-2 py-1 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </Card>
      <UserEditDrawer
        open={editOpen}
        onOpenChange={(open) => (open ? setEditOpen(true) : closeEdit())}
        editSaving={editSaving}
        editError={editError}
        title="Edit user"
        description="Update user details for this system."
        editState={editState}
        setEditState={setEditState}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        confirmLoginCode={confirmLoginCode}
        setConfirmLoginCode={setConfirmLoginCode}
        confirmVoicemailCode={confirmVoicemailCode}
        setConfirmVoicemailCode={setConfirmVoicemailCode}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        showLoginCode={showLoginCode}
        setShowLoginCode={setShowLoginCode}
        showVoicemailCode={showVoicemailCode}
        setShowVoicemailCode={setShowVoicemailCode}
        onSubmit={submitEdit}
        onCancel={closeEdit}
        packageOptions={packageOptions}
        applyPackageRules={applyPackageRules}
        isFeatureDisabled={isFeatureDisabled}
      />

      <UserEditDrawer
        open={createOpen}
        onOpenChange={(open) => (open ? setCreateOpen(true) : closeCreate())}
        editSaving={createSaving}
        editError={createError}
        title="Add user"
        description="Create a new user for this system."
        submitLabel="Create user"
        editState={createState}
        setEditState={setCreateState}
        confirmPassword={createConfirmPassword}
        setConfirmPassword={setCreateConfirmPassword}
        confirmLoginCode={createConfirmLoginCode}
        setConfirmLoginCode={setCreateConfirmLoginCode}
        confirmVoicemailCode={createConfirmVoicemailCode}
        setConfirmVoicemailCode={setCreateConfirmVoicemailCode}
        showPassword={createShowPassword}
        setShowPassword={setCreateShowPassword}
        showLoginCode={createShowLoginCode}
        setShowLoginCode={setCreateShowLoginCode}
        showVoicemailCode={createShowVoicemailCode}
        setShowVoicemailCode={setCreateShowVoicemailCode}
        onSubmit={submitCreate}
        onCancel={closeCreate}
        packageOptions={packageOptions}
        applyPackageRules={applyPackageRules}
        isFeatureDisabled={isFeatureDisabled}
      />

      <UserDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        deleteBusy={deleteBusy}
        deleteError={deleteError}
        userName={deleteRow?.name ?? null}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
