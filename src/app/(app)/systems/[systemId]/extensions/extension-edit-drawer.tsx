"use client";

import * as React from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExtensionEditState } from "./extensions-types";
import { Loader2 } from "lucide-react";

export function ExtensionEditDrawer(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  error: string | null;
  title?: string;
  description?: string;
  submitLabel?: string;
  editState: ExtensionEditState;
  setEditState: React.Dispatch<React.SetStateAction<ExtensionEditState>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  typeOptions: { value: string; label: string }[];
  callerDisplayOptions: { value: string; label: string }[];
  showId?: boolean;
}) {
  const { editState, saving, error } = props;

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md flex h-full flex-col">
        <SheetHeader>
          <SheetTitle>{props.title ?? "Edit extension"}</SheetTitle>
          <SheetDescription>
            {props.description ?? "Update extension details for this system."}
          </SheetDescription>
        </SheetHeader>

        {error ? (
          <div className="mx-4 mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={props.onSubmit}
          className="flex flex-1 min-h-0 flex-col"
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="ext-extension">Extension</Label>
                <Input
                  id="ext-extension"
                  value={editState.extension}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      extension: e.target.value,
                    }))
                  }
                  autoComplete="off"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ext-type">Type</Label>
                <Select
                  value={editState.typeInfo}
                  onValueChange={(value) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      typeInfo: value,
                    }))
                  }
                  disabled={saving}
                >
                  <SelectTrigger id="ext-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ext-caller-display">Caller Display</Label>
                <Select
                  value={editState.callerDisplayType}
                  onValueChange={(value) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      callerDisplayType: value,
                    }))
                  }
                  disabled={saving}
                >
                  <SelectTrigger id="ext-caller-display" className="w-full">
                    <SelectValue placeholder="Select caller display type" />
                  </SelectTrigger>
                  <SelectContent>
                    {props.callerDisplayOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ext-module">Module</Label>
                <Input
                  id="ext-module"
                  value={editState.module}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      module: e.target.value,
                    }))
                  }
                  autoComplete="off"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ext-port">Port</Label>
                <Input
                  id="ext-port"
                  value={editState.port}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      port: e.target.value,
                    }))
                  }
                  autoComplete="off"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ext-location">Location</Label>
                <Input
                  id="ext-location"
                  value={editState.location}
                  onChange={(e) =>
                    props.setEditState((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  autoComplete="off"
                  disabled={saving}
                />
              </div>

              {props.showId ? (
                <div className="space-y-2">
                  <Label htmlFor="ext-id">Id</Label>
                  <Input id="ext-id" value={editState.id} disabled />
                </div>
              ) : null}
            </div>
          </div>

          <SheetFooter className="border-t bg-background">
            <div className="flex items-center justify-end gap-2 px-4 pb-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={props.onCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving
                  </>
                ) : (
                  props.submitLabel ?? "Save"
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
