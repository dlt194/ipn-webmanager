"use client";

import { Input } from "@/components/ui/input";

export function SystemsToolbar(props: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <Input
        placeholder="Search by name, version, LAN IP, or voicemail type"
        value={props.search}
        onChange={(e) => props.onSearchChange(e.target.value)}
        className="max-w-md"
      />
    </div>
  );
}
