"use client";
import dynamic from "next/dynamic";
import * as React from "react";
import Link from "next/link";
import { EthernetPort } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ProfileMenu } from "./ProfileMenu";
import { AddSystemDialog } from "@/components/AddSystemDialog";

const ThemeToggle = dynamic(
  () => import("@/components/theme-toggle").then((m) => m.ThemeToggle),
  { ssr: false },
);

type ServerRow = {
  id: string;
  name: string;
  host: string;
  username: string;
};

type Status = "connected" | "disconnected" | "unknown";

export default function SideBar() {
  const [servers, setServers] = React.useState<ServerRow[]>([]);
  const [statusById, setStatusById] = React.useState<Record<string, Status>>(
    {},
  );
  const [loading, setLoading] = React.useState(true);

  // Load servers once
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/server-configs", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load server configs");
        const data = (await res.json()) as ServerRow[];
        if (cancelled) return;

        setServers(data);
        // default unknown
        const initial: Record<string, Status> = {};
        for (const s of data) initial[s.id] = "unknown";
        setStatusById(initial);
      } catch {
        if (!cancelled) setServers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Periodic status checks (occasional ping)
  React.useEffect(() => {
    if (servers.length === 0) return;

    let cancelled = false;

    async function checkOne(id: string) {
      try {
        const res = await fetch(`/api/server-configs/${id}/status`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("status failed");
        const data = (await res.json()) as { reachable: boolean };
        if (cancelled) return;

        setStatusById((prev) => ({
          ...prev,
          [id]: data.reachable ? "connected" : "disconnected",
        }));
      } catch {
        if (cancelled) return;
        setStatusById((prev) => ({ ...prev, [id]: "disconnected" }));
      }
    }

    // Initial check (staggered to avoid hammering)
    (async () => {
      for (const s of servers) {
        if (cancelled) return;
        await checkOne(s.id);
        await new Promise((r) => setTimeout(r, 150)); // small stagger
      }
    })();

    // Repeat every 60s (adjust as you like)
    const interval = setInterval(() => {
      servers.forEach((s) => {
        void checkOne(s.id);
      });
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [servers]);

  const loadServers = React.useCallback(async () => {
    const res = await fetch("/api/server-configs", { cache: "no-store" });
    if (!res.ok) return;

    const rows = (await res.json()) as ServerRow[];
    setServers(rows);

    // keep status map in sync (remove deleted IDs, add new IDs as unknown)
    setStatusById((prev) => {
      const next: Record<string, Status> = {};
      for (const r of rows) next[r.id] = prev[r.id] ?? "unknown";
      return next;
    });
  }, []);

  React.useEffect(() => {
    void loadServers();
  }, [loadServers]);

  React.useEffect(() => {
    const onChanged = () => void loadServers();
    window.addEventListener("server-configs:changed", onChanged);
    return () =>
      window.removeEventListener("server-configs:changed", onChanged);
  }, [loadServers]);

  return (
    <Sidebar>
      <SidebarContent className="relative">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xl font-semibold tracking-tight">
            Web Configuration
          </SidebarGroupLabel>
          <SidebarGroupLabel className="text-sm text-zinc-600 dark:text-zinc-400">
            by Dan Thomas
          </SidebarGroupLabel>

          <SidebarSeparator className="my-2" />

          <SidebarGroupContent>
            <SidebarMenu>
              <AddSystemDialog
                onCreated={(created) => {
                  setServers((prev) => [created, ...prev]);
                  setStatusById((prev) => ({
                    ...prev,
                    [created.id]: "unknown",
                  }));
                }}
              />

              <SidebarSeparator className="my-2" />

              {loading ? (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  Loading systems…
                </div>
              ) : servers.length === 0 ? (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  No systems configured.
                </div>
              ) : (
                servers.map((s) => {
                  const status = statusById[s.id] ?? "unknown";

                  const iconClass =
                    status === "disconnected"
                      ? "h-4 w-4 text-red-600 animate-[pulse_1.5s_ease-in-out_infinite]"
                      : status === "connected"
                        ? "h-4 w-4 text-green-600"
                        : "h-4 w-4 text-zinc-400";

                  return (
                    <SidebarMenuItem key={s.id}>
                      <SidebarMenuButton asChild>
                        <Link
                          href={`/systems/${encodeURIComponent(s.id)}`}
                          className="flex items-center gap-2"
                        >
                          <EthernetPort className={iconClass} />
                          <span className="truncate">{s.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="absolute bottom-0 left-0 right-0">
          <SidebarSeparator className="my-2" />
          <div className="flex items-center justify-between px-2 pb-2">
            <ProfileMenu />
            <ThemeToggle />
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
