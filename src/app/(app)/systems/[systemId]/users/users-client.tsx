"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
import * as React from "react";

type Row = {
  guid: string;
  name: string;
  fullName: string;
  extension: string;
  assignedPackage: string;
  [key: string]: string;
};

type ApiOk = {
  users: Row[];
  raw?: string;
  meta?: Record<string, unknown>;
};

type ApiErr = { error?: string };

const PACKAGE_MAP: Record<number, string> = {
  1: "Basic User",
  2: "Teleworker User",
  3: "Mobile User",
  4: "Power User",
  5: "Office Worker User",
  6: "Not Used",
  7: "Centralized User",
  8: "Non Licensed User",
};

const TWINNING_OPTIONS = [
  { value: "0", label: "No Twinning" },
  { value: "1", label: "Internal Twinning" },
  { value: "2", label: "Mobile Twinning" },
] as const;

type SortKey = "name" | "fullName" | "extension" | "assignedPackage";
type SortDir = "asc" | "desc";

function compare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

type UserEditState = {
  name: string;
  fullName: string;
  extension: string;
  assignedPackage: string;
  canIntrude: string;
  cannotBeIntruded: string;
  dndExceptions: string;
  doNotDisturb: string;
  expansionType: string;
  flareEnabled: string;
  flare: string;
  forceAccountCode: string;
  idleLinePreference: string;
  loginCode: string;
  mobilityFeatures: string;
  oneXClient: string;
  oneXTelecommuter: string;
  outgoingCallBar: string;
  outOfHoursUserRights: string;
  userRightsTimeProfile: string;
  password: string;
  phoneType: string;
  priority: string;
  receptionist: string;
  remoteWorker: string;
  sipContact: string;
  sipName: string;
  specificBstType: string;
  twinningType: string;
  umsWebServices: string;
  userRights: string;
  voicemailCode: string;
  voicemailEmail: string;
  voicemailOn: string;
  webCollaboration: string;
  xDirectory: string;
};

const EMPTY_EDIT_STATE: UserEditState = {
  name: "",
  fullName: "",
  extension: "",
  assignedPackage: "",
  canIntrude: "false",
  cannotBeIntruded: "false",
  dndExceptions: "",
  doNotDisturb: "false",
  expansionType: "",
  flareEnabled: "false",
  flare: "false",
  forceAccountCode: "false",
  idleLinePreference: "false",
  loginCode: "",
  mobilityFeatures: "false",
  oneXClient: "false",
  oneXTelecommuter: "false",
  outgoingCallBar: "false",
  outOfHoursUserRights: "",
  userRightsTimeProfile: "",
  password: "",
  phoneType: "",
  priority: "",
  receptionist: "false",
  remoteWorker: "false",
  sipContact: "",
  sipName: "",
  specificBstType: "",
  twinningType: "",
  umsWebServices: "false",
  userRights: "",
  voicemailCode: "",
  voicemailEmail: "",
  voicemailOn: "false",
  webCollaboration: "false",
  xDirectory: "false",
};

export default function UsersClient({ systemId }: { systemId: string }) {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [raw, setRaw] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const fetchUsers = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setRaw(null);
    setMeta(null);

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
    setRaw(typeof json.raw === "string" ? json.raw : null);
    setMeta((json.meta as Record<string, unknown>) ?? null);
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

  function isChecked(value: string) {
    return value === "true";
  }

  function booleanLabel(value: string) {
    return isChecked(value) ? "Yes" : "No";
  }

  function renderBooleanField(
    id: string,
    label: string,
    value: string,
    onChange: (nextValue: "true" | "false") => void,
    disabled = false,
  ) {
    return (
      <div className="flex items-center justify-between gap-4 rounded border px-3 py-2">
        <div className="space-y-1">
          <Label htmlFor={id}>{label}</Label>
          <p className="text-xs text-muted-foreground">
            {booleanLabel(value)}
          </p>
        </div>
        <input
          id={id}
          type="checkbox"
          checked={isChecked(value)}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          disabled={editSaving || disabled}
          className="size-4 accent-primary"
        />
      </div>
    );
  }

  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<Row | null>(null);
  const [editState, setEditState] =
    React.useState<UserEditState>(EMPTY_EDIT_STATE);
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [confirmLoginCode, setConfirmLoginCode] = React.useState("");
  const [confirmVoicemailCode, setConfirmVoicemailCode] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showLoginCode, setShowLoginCode] = React.useState(false);
  const [showVoicemailCode, setShowVoicemailCode] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editSaving, setEditSaving] = React.useState(false);

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

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteRow, setDeleteRow] = React.useState<Row | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  function startEdit(row: Row) {
    const getAnyField = (keys: string[]) =>
      keys.map((k) => row[k]).find((v) => typeof v === "string") ?? "";

    setEditRow(row);
    setEditState({
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
    });
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

    const payload = {
      guid: editRow.guid,
      name: editState.name.trim(),
      fullName: editState.fullName.trim(),
      extension: editState.extension.trim(),
      assignedPackage: editState.assignedPackage,
      canIntrude: editState.canIntrude,
      cannotBeIntruded: editState.cannotBeIntruded,
      dndExceptions: editState.dndExceptions,
      doNotDisturb: editState.doNotDisturb,
      flareEnabled: editState.flareEnabled,
      flare: editState.flare,
      forceAccountCode: editState.forceAccountCode,
      idleLinePreference: editState.idleLinePreference,
      loginCode: editState.loginCode,
      mobilityFeatures: editState.mobilityFeatures,
      oneXClient: editState.oneXClient,
      oneXTelecommuter: editState.oneXTelecommuter,
      outgoingCallBar: editState.outgoingCallBar,
      outOfHoursUserRights: editState.outOfHoursUserRights,
      userRightsTimeProfile: editState.userRightsTimeProfile,
      password: editState.password,
      priority: editState.priority,
      receptionist: editState.receptionist,
      remoteWorker: editState.remoteWorker,
      sipContact: editState.sipContact,
      sipName: editState.sipName,
      twinningType: editState.twinningType,
      umsWebServices: editState.umsWebServices,
      userRights: editState.userRights,
      voicemailCode: editState.voicemailCode,
      voicemailEmail: editState.voicemailEmail,
      voicemailOn: editState.voicemailOn,
      webCollaboration: editState.webCollaboration,
      xDirectory: editState.xDirectory,
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
          body: JSON.stringify({ guid: deleteRow.guid }),
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

  const thBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      className="inline-flex items-center gap-1 font-medium"
      title="Sort"
    >
      {label}
      {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : null}
    </button>
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <Input
          placeholder="Search by username, full name, or extension"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left">{thBtn("name", "Name")}</th>
                  <th className="py-2 text-left">
                    {thBtn("fullName", "Full Name")}
                  </th>
                  <th className="py-2 text-left">
                    {thBtn("extension", "Extension")}
                  </th>
                  <th className="py-2 text-left">
                    {thBtn("assignedPackage", "Package")}
                  </th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.guid} className="border-b last:border-0">
                    <td className="py-2">{u.name}</td>
                    <td className="py-2">{u.fullName}</td>
                    <td className="py-2">{u.extension}</td>
                    <td className="py-2">
                      {renderPackageLabel(u.assignedPackage)}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEdit(u)}
                          aria-label={`Edit ${u.name}`}
                          title="Edit user"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startDelete(u)}
                          aria-label={`Delete ${u.name}`}
                          title="Delete user"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Debug
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded border p-3 text-xs">
              {JSON.stringify(meta, null, 2)}
            </pre>
          </details>
        ) : null}

        {raw ? (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Raw response
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded border p-3 text-xs">
              {raw}
            </pre>
          </details>
        ) : null}
      </Card>

      <Sheet
        open={editOpen}
        onOpenChange={(open) => (open ? setEditOpen(true) : closeEdit())}
      >
        <SheetContent side="right" className="sm:max-w-md flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>Edit user</SheetTitle>
            <SheetDescription>
              Update user details for this system.
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={submitEdit}
            className="flex flex-1 min-h-0 flex-col"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-2">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-fullname">Full Name</Label>
                  <Input
                    id="edit-fullname"
                    value={editState.fullName}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    }
                    autoComplete="off"
                    disabled={editSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-extension">Extension</Label>
                  <Input
                    id="edit-extension"
                    value={editState.extension}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        extension: e.target.value,
                      }))
                    }
                    autoComplete="off"
                    disabled={editSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Profile</Label>
                  <Select
                    value={editState.assignedPackage}
                    onValueChange={(value) =>
                      setEditState((prev) => applyPackageRules(value, prev))
                    }
                    disabled={editSaving}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {packageOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Profile Features</Label>
                  <div className="space-y-2">
                    {renderBooleanField(
                      "edit-receptionist",
                      "Receptionist",
                      editState.receptionist,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          receptionist: nextValue,
                        })),
                      isFeatureDisabled(editState.assignedPackage, "receptionist"),
                    )}

                    {renderBooleanField(
                      "edit-softphone",
                      "SoftPhone",
                      editState.flareEnabled,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          flareEnabled: nextValue,
                        })),
                      isFeatureDisabled(editState.assignedPackage, "flareEnabled"),
                    )}

                    {renderBooleanField(
                      "edit-onex-portal",
                      "One-X Portal Services",
                      editState.oneXClient,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          oneXClient: nextValue,
                        })),
                      isFeatureDisabled(editState.assignedPackage, "oneXClient"),
                    )}

                    {renderBooleanField(
                      "edit-onex-telecommuter",
                      "One-X Telecommuter",
                      editState.oneXTelecommuter,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          oneXTelecommuter: nextValue,
                        })),
                      isFeatureDisabled(
                        editState.assignedPackage,
                        "oneXTelecommuter",
                      ),
                    )}

                    {renderBooleanField(
                      "edit-remote-worker",
                      "Remote Worker",
                      editState.remoteWorker,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          remoteWorker: nextValue,
                        })),
                      isFeatureDisabled(editState.assignedPackage, "remoteWorker"),
                    )}

                    {renderBooleanField(
                      "edit-voip-client",
                      "Desktop/VoIP Client",
                      editState.flare,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          flare: nextValue,
                        })),
                      isFeatureDisabled(editState.assignedPackage, "flare"),
                    )}

                    {renderBooleanField(
                      "edit-mobile-voip-client",
                      "Mobile VoIP Client",
                      editState.mobilityFeatures,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          mobilityFeatures: nextValue,
                        })),
                      isFeatureDisabled(
                        editState.assignedPackage,
                        "mobilityFeatures",
                      ),
                    )}

                    {renderBooleanField(
                      "edit-web-collaboration",
                      "Web Collaboration",
                      editState.webCollaboration,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          webCollaboration: nextValue,
                        })),
                      isFeatureDisabled(
                        editState.assignedPackage,
                        "webCollaboration",
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded border p-3">
                  <p className="text-sm font-medium">Credentials</p>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-username">Username</Label>
                      <Input
                        id="edit-username"
                        value={editState.name}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        autoComplete="off"
                        disabled={editSaving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-password">Password</Label>
                      <InputGroup>
                        <InputGroupInput
                          id="edit-password"
                          type={showPassword ? "text" : "password"}
                          value={editState.password}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          autoComplete="new-password"
                          disabled={editSaving}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-confirm-password">
                        Confirm Password
                      </Label>
                      <InputGroup>
                        <InputGroupInput
                          id="edit-confirm-password"
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          disabled={editSaving}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-login-code">Login Code</Label>
                      <InputGroup>
                        <InputGroupInput
                          id="edit-login-code"
                          type={showLoginCode ? "text" : "password"}
                          value={editState.loginCode}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              loginCode: e.target.value,
                            }))
                          }
                          disabled={editSaving}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            type="button"
                            onClick={() => setShowLoginCode((v) => !v)}
                            aria-label={
                              showLoginCode
                                ? "Hide login code"
                                : "Show login code"
                            }
                          >
                            {showLoginCode ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-confirm-login-code">
                        Confirm Login Code
                      </Label>
                      <InputGroup>
                        <InputGroupInput
                          id="edit-confirm-login-code"
                          type={showLoginCode ? "text" : "password"}
                          value={confirmLoginCode}
                          onChange={(e) => setConfirmLoginCode(e.target.value)}
                          disabled={editSaving}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            type="button"
                            onClick={() => setShowLoginCode((v) => !v)}
                            aria-label={
                              showLoginCode
                                ? "Hide login code"
                                : "Show login code"
                            }
                          >
                            {showLoginCode ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>
                  </div>
                </div>

                {renderBooleanField(
                  "edit-can-intrude",
                  "Can Intrude",
                  editState.canIntrude,
                  (nextValue) =>
                    setEditState((prev) => ({
                      ...prev,
                      canIntrude: nextValue,
                    })),
                )}

                {renderBooleanField(
                  "edit-cannot-be-intruded",
                  "Cannot Be Intruded",
                  editState.cannotBeIntruded,
                  (nextValue) =>
                    setEditState((prev) => ({
                      ...prev,
                      cannotBeIntruded: nextValue,
                    })),
                )}

                {renderBooleanField(
                  "edit-dnd",
                  "Do Not Disturb",
                  editState.doNotDisturb,
                  (nextValue) =>
                    setEditState((prev) => ({
                      ...prev,
                      doNotDisturb: nextValue,
                    })),
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-dnd-exceptions">DND Exceptions</Label>
                  <Input
                    id="edit-dnd-exceptions"
                    value={editState.dndExceptions}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        dndExceptions: e.target.value,
                      }))
                    }
                    disabled={editSaving}
                  />
                </div>

                {renderBooleanField(
                  "edit-force-account-code",
                  "Force Account Code",
                  editState.forceAccountCode,
                  (nextValue) =>
                    setEditState((prev) => ({
                      ...prev,
                      forceAccountCode: nextValue,
                    })),
                )}

                {renderBooleanField(
                  "edit-idle-line-preference",
                  "Idle Line Preference",
                  editState.idleLinePreference,
                  (nextValue) =>
                    setEditState((prev) => ({
                      ...prev,
                      idleLinePreference: nextValue,
                    })),
                )}

                {renderBooleanField(
                  "edit-outgoing-call-bar",
                  "Outgoing Call Bar",
                  editState.outgoingCallBar,
                  (nextValue) =>
                    setEditState((prev) => ({
                      ...prev,
                      outgoingCallBar: nextValue,
                    })),
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-out-of-hours-rights">
                    Out Of Hours User Rights
                  </Label>
                  <Input
                    id="edit-out-of-hours-rights"
                    value={editState.outOfHoursUserRights}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        outOfHoursUserRights: e.target.value,
                      }))
                    }
                    disabled={editSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Input
                    id="edit-priority"
                    value={editState.priority}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                    disabled={editSaving}
                  />
                </div>

                <div className="rounded border p-3">
                  <p className="text-sm font-medium">SIP Settings</p>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-sip-contact">SIP Contact</Label>
                      <Input
                        id="edit-sip-contact"
                        value={editState.sipContact}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            sipContact: e.target.value,
                          }))
                        }
                        disabled={editSaving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-sip-name">SIP Name</Label>
                      <Input
                        id="edit-sip-name"
                        value={editState.sipName}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            sipName: e.target.value,
                          }))
                        }
                        disabled={editSaving}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Twinning Type</Label>
                  <Select
                    value={editState.twinningType}
                    onValueChange={(value) =>
                      setEditState((prev) => ({
                        ...prev,
                        twinningType: value,
                      }))
                    }
                    disabled={editSaving}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select twinning type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TWINNING_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-user-rights">User Rights</Label>
                  <Input
                    id="edit-user-rights"
                    value={editState.userRights}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        userRights: e.target.value,
                      }))
                    }
                    disabled={editSaving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-user-rights-time-profile">
                    User Rights Time Profile
                  </Label>
                  <Input
                    id="edit-user-rights-time-profile"
                    value={editState.userRightsTimeProfile}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        userRightsTimeProfile: e.target.value,
                      }))
                    }
                    disabled={editSaving}
                  />
                </div>

                <div className="rounded border p-3">
                  <p className="text-sm font-medium">Voicemail</p>
                  <div className="mt-3 space-y-3">
                    {renderBooleanField(
                      "edit-voicemail-on",
                      "Voicemail On",
                      editState.voicemailOn,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          voicemailOn: nextValue,
                        })),
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="edit-voicemail-code">Voicemail Code</Label>
                      <InputGroup>
                        <InputGroupInput
                          id="edit-voicemail-code"
                          type={showVoicemailCode ? "text" : "password"}
                          value={editState.voicemailCode}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              voicemailCode: e.target.value,
                            }))
                          }
                          disabled={editSaving}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            type="button"
                            onClick={() => setShowVoicemailCode((v) => !v)}
                            aria-label={
                              showVoicemailCode
                                ? "Hide voicemail code"
                                : "Show voicemail code"
                            }
                          >
                            {showVoicemailCode ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-confirm-voicemail-code">
                        Confirm Voicemail Code
                      </Label>
                      <InputGroup>
                        <InputGroupInput
                          id="edit-confirm-voicemail-code"
                          type={showVoicemailCode ? "text" : "password"}
                          value={confirmVoicemailCode}
                          onChange={(e) =>
                            setConfirmVoicemailCode(e.target.value)
                          }
                          disabled={editSaving}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupButton
                            type="button"
                            onClick={() => setShowVoicemailCode((v) => !v)}
                            aria-label={
                              showVoicemailCode
                                ? "Hide voicemail code"
                                : "Show voicemail code"
                            }
                          >
                            {showVoicemailCode ? <EyeOff /> : <Eye />}
                          </InputGroupButton>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-voicemail-email">
                        Voicemail Email
                      </Label>
                      <Input
                        id="edit-voicemail-email"
                        value={editState.voicemailEmail}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            voicemailEmail: e.target.value,
                          }))
                        }
                        disabled={editSaving}
                      />
                    </div>

                    {renderBooleanField(
                      "edit-ums-web-services",
                      "UMS Web Services",
                      editState.umsWebServices,
                      (nextValue) =>
                        setEditState((prev) => ({
                          ...prev,
                          umsWebServices: nextValue,
                        })),
                    )}
                  </div>
                </div>

                {renderBooleanField(
                  "edit-x-directory",
                  "X Directory",
                  editState.xDirectory,
                  (nextValue) =>
                    setEditState((prev) => ({
                      ...prev,
                      xDirectory: nextValue,
                    })),
                )}

                {editError ? (
                  <p className="text-sm text-red-600 whitespace-pre-wrap">
                    {editError}
                  </p>
                ) : null}
              </div>
            </div>

            <SheetFooter className="border-t bg-background">
              <div className="flex items-center justify-end gap-2 px-4 pb-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEdit}
                  disabled={editSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editSaving || !editRow}>
                  {editSaving ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Saving
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={(open) => (!deleteBusy ? setDeleteOpen(open) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteRow?.name || "this user"}
              </span>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError ? (
            <p className="text-sm text-red-600 whitespace-pre-wrap">
              {deleteError}
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleteBusy || !deleteRow}
            >
              {deleteBusy ? (
                <>
                  <Loader2 className="animate-spin" />
                  Deleting
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
