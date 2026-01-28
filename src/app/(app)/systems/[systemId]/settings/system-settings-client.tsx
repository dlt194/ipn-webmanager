"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type ServerConfig = {
  id: string;
  name: string;
  host: string;
  username: string;
};

export default function SystemSettingsClient({
  systemId,
}: {
  systemId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [host, setHost] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState(""); // optional update

  async function load() {
    setError(null);
    setSaved(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}`,
        {
          cache: "no-store",
        },
      );

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? "Failed to load system.");
      }

      const data = (await res.json()) as ServerConfig;
      setName(data.name ?? "");
      setHost(data.host ?? "");
      setUsername(data.username ?? "");
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load system.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemId]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);

    const payload: {
      name: string;
      host: string;
      username: string;
      password?: string;
    } = {
      name: name.trim(),
      host: host.trim(),
      username: username.trim(),
    };

    if (!payload.name || !payload.host || !payload.username) {
      setError("Please complete name, host, and username.");
      return;
    }

    if (password.trim()) payload.password = password;

    setBusy(true);
    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? "Failed to update system.");
      }

      setPassword(""); // clear after save
      setSaved("Saved.");
      window.dispatchEvent(new Event("server-configs:changed")); // sidebar refresh
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update system.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setError(null);
    setSaved(null);
    setBusy(true);

    try {
      const res = await fetch(
        `/api/server-configs/${encodeURIComponent(systemId)}`,
        {
          method: "DELETE",
          cache: "no-store",
        },
      );

      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? "Failed to delete system.");
      }

      window.dispatchEvent(new Event("server-configs:changed"));
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete system.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Update connection details for this system.
        </p>
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form onSubmit={onSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="host">IP / FQDN</Label>
                <Input
                  id="host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (leave blank to keep)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {saved ? <p className="text-sm text-green-600">{saved}</p> : null}

            <div className="flex items-center justify-between pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={busy}>
                    <Trash2 className="mr-2 size-4" />
                    Delete system
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this system?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the saved configuration and credentials.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      disabled={busy}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button type="submit" disabled={busy}>
                <Save className="mr-2 size-4" />
                {busy ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
