"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { Row } from "./users-types";

export type SortKey = "name" | "fullName" | "extension" | "assignedPackage";
export type SortDir = "asc" | "desc";

export function UsersTable(props: {
  rows: Row[];
  sortKey: SortKey;
  sortDir: SortDir;
  onToggleSort: (key: SortKey) => void;
  onEdit: (row: Row) => void;
  onDelete: (row: Row) => void;
  renderPackageLabel: (value: string) => string;
}) {
  const { rows, sortKey, sortDir } = props;

  const thBtn = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => props.onToggleSort(key)}
      className="inline-flex items-center gap-1 font-medium"
      title="Sort"
    >
      {label}
      {sortKey === key ? (sortDir === "asc" ? "▲" : "▼") : null}
    </button>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 text-left">{thBtn("name", "Name")}</th>
            <th className="py-2 text-left">{thBtn("fullName", "Full Name")}</th>
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
          {rows.map((u) => (
            <tr key={u.guid} className="border-b last:border-0">
              <td className="py-2">{u.name}</td>
              <td className="py-2">{u.fullName}</td>
              <td className="py-2">{u.extension}</td>
              <td className="py-2">
                {props.renderPackageLabel(u.assignedPackage)}
              </td>
              <td className="py-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => props.onEdit(u)}
                    aria-label={`Edit ${u.name}`}
                    title="Edit user"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => props.onDelete(u)}
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
  );
}
