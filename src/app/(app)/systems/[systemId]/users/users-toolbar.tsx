"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UsersToolbar(props: {
  search: string;
  onSearchChange: (value: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <Input
        placeholder="Search by name, full name, or extension"
        value={props.search}
        onChange={(e) => props.onSearchChange(e.target.value)}
        className="max-w-md"
      />
      {props.onAdd ? (
        <Button onClick={props.onAdd} size="sm">
          Add User
        </Button>
      ) : null}
    </div>
  );
}
