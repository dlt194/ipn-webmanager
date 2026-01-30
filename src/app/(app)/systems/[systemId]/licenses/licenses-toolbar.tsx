"use client";

import { Input } from "@/components/ui/input";

export function LicensesToolbar(props: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <Input
        placeholder="Search by license key, display name, status, or type"
        value={props.search}
        onChange={(e) => props.onSearchChange(e.target.value)}
        className="max-w-md"
      />
    </div>
  );
}
