"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
} from "@/components/ui/navigation-menu";

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

import { Button } from "@/components/ui/button";

export default function SystemTopBar({ systemId }: { systemId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  async function handleDelete() {
    if (!systemId) return;

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

      // refresh sidebar + route state
      window.dispatchEvent(new Event("server-configs:changed"));

      // take user somewhere safe
      router.replace("/");
      router.refresh();
    } catch (e) {
      console.error(e);
      // optionally: toast here later
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b bg-background">
      <NavigationMenu className="max-w-full">
        <div className="mx-auto flex h-12 max-w-5xl items-center px-4">
          {/* Left */}
          <NavigationMenuList className="flex-1">
            <NavigationMenuItem>
              <span className="text-sm font-medium text-muted-foreground">
                System
              </span>
            </NavigationMenuItem>
          </NavigationMenuList>

          {/* Right actions */}
          <NavigationMenuList>
            <NavigationMenuItem>
              {mounted ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete system"
                    >
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this system?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the system and all
                        associated configuration. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={busy}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={busy}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {busy ? "Deleting…" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                // SSR-safe placeholder avoids Radix SSR hydration mismatch
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete system"
                  disabled
                >
                  <Trash2 className="h-5 w-5 text-red-600" />
                </Button>
              )}
            </NavigationMenuItem>
          </NavigationMenuList>
        </div>
      </NavigationMenu>
    </header>
  );
}
