"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExtensionsToolbar(props: {
  search: string;
  onSearchChange: (value: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <Input
        placeholder="Search by extension, type, module, port, or location"
        value={props.search}
        onChange={(e) => props.onSearchChange(e.target.value)}
        className="max-w-md"
      />
      {props.onAdd ? (
        <Button onClick={props.onAdd} size="sm">
          Add Extension
        </Button>
      ) : null}
    </div>
  );
}
