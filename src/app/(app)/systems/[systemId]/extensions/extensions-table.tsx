"use client";

import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { ExtensionRow } from "./extensions-types";

export function ExtensionsTable(props: {
  rows: ExtensionRow[];
  renderTypeInfo: (value: string) => string;
  renderCallerDisplay: (value: string) => string;
  onEdit: (row: ExtensionRow) => void;
  onDelete: (row: ExtensionRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 text-left">Extension</th>
            <th className="py-2 text-left">Type</th>
            <th className="py-2 text-left">Module</th>
            <th className="py-2 text-left">Port</th>
            <th className="py-2 text-left">Location</th>
            <th className="py-2 text-left">Caller Display</th>
            <th className="py-2 text-left">Id</th>
            <th className="py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => (
            <tr key={row.guid || `${row.extension}-${row.id}`} className="border-b last:border-0">
              <td className="py-2">{row.extension}</td>
              <td className="py-2">{props.renderTypeInfo(row.typeInfo)}</td>
              <td className="py-2">{row.module}</td>
              <td className="py-2">{row.port}</td>
              <td className="py-2">{row.location}</td>
              <td className="py-2">
                {props.renderCallerDisplay(row.callerDisplayType)}
              </td>
              <td className="py-2">{row.id}</td>
              <td className="py-2">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => props.onEdit(row)}
                    aria-label={`Edit extension ${row.extension}`}
                    title="Edit extension"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => props.onDelete(row)}
                    aria-label={`Delete extension ${row.extension}`}
                    title="Delete extension"
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
