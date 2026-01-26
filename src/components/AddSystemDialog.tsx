"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

type AddSystemDialogProps = {
  onCreated: (created: {
    id: string;
    name: string;
    host: string;
    username: string;
    createdAt: string;
    updatedAt: string;
  }) => void;
};

export function AddSystemDialog({ onCreated }: AddSystemDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [host, setHost] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  function reset() {
    setName("");
    setHost("");
    setUsername("");
    setPassword("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: name.trim(),
      host: host.trim(),
      username: username.trim(),
      password,
    };

    if (
      !payload.name ||
      !payload.host ||
      !payload.username ||
      !payload.password
    ) {
      setError("Please complete all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/server-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? "Failed to create system.");
      }

      const created = await res.json();
      onCreated(created);

      reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create system.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          Add System
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg bg-[#101828] text-white">
        <DialogHeader>
          <DialogTitle>Add system</DialogTitle>
          <DialogDescription>
            Add a server by IP/FQDN and credentials. Passwords are stored
            server-side encrypted.
          </DialogDescription>
        </DialogHeader>

        <Card className="p-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                placeholder="e.g. IP Netix / Lab"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="host">IP / FQDN</Label>
              <Input
                id="host"
                placeholder="e.g. 10.0.0.10 or ipoffice.example.local"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save system"}
              </Button>
            </div>
          </form>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
