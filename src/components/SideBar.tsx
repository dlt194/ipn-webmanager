"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import Link from "next/link";
import { EthernetPort } from "lucide-react";

import {
  clientHttpCheck,
  normalizeHostForClient,
  resolveReachability,
  type Reachability,
} from "@/lib/reachability";

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

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ProfileMenu } from "./ProfileMenu";
import { AddSystemDialog } from "@/components/AddSystemDialog";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

function iconClass(r: Reachability) {
  if (r === "green") return "text-green-600";
  if (r === "amber") return "text-amber-500 animate-pulse";
  return "text-red-600";
}

export default function SideBar() {
  const [servers, setServers] = React.useState<ServerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [probeById, setProbeById] = React.useState<
    Record<string, { server: boolean; client: boolean }>
  >({});

  // final resolved state per system (green/amber/red)
  const [reachabilityById, setReachabilityById] = React.useState<
    Record<string, Reachability>
  >({});

  const loadServers = React.useCallback(async () => {
    const res = await fetch("/api/server-configs", { cache: "no-store" });

    if (!res.ok) {
      setServers([]);
      setReachabilityById({});
      setProbeById({});
      return;
    }

    const rows = (await res.json()) as ServerRow[];
    setServers(rows);

    // keep reachability map in sync
    setReachabilityById((prev) => {
      const next: Record<string, Reachability> = {};
      for (const r of rows) next[r.id] = prev[r.id] ?? "red";
      return next;
    });

    // keep probe map in sync
    setProbeById((prev) => {
      const next: Record<string, { server: boolean; client: boolean }> = {};
      for (const r of rows)
        next[r.id] = prev[r.id] ?? { server: false, client: false };
      return next;
    });
  }, []);

  // initial load
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadServers();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadServers]);

  // refresh when systems are created/deleted
  React.useEffect(() => {
    const onChanged = () => void loadServers();
    window.addEventListener("server-configs:changed", onChanged);
    return () =>
      window.removeEventListener("server-configs:changed", onChanged);
  }, [loadServers]);

  // periodic reachability checks (server TCP + client HTTP best-effort)
  React.useEffect(() => {
    if (servers.length === 0) return;

    let cancelled = false;

    async function pollOne(id: string, host: string) {
      const [serverOk, clientOk] = await Promise.all([
        fetch(`/api/server-configs/${encodeURIComponent(id)}/status`, {
          cache: "no-store",
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => !!j?.serverReachable)
          .catch(() => false),

        clientHttpCheck(normalizeHostForClient(host)).catch(() => false),
      ]);

      if (cancelled) return;

      const resolved = resolveReachability(serverOk, clientOk);
      setReachabilityById((prev) => ({ ...prev, [id]: resolved }));
      setProbeById((prev) => ({
        ...prev,
        [id]: { server: serverOk, client: clientOk },
      }));
    }

    async function pollAll() {
      // stagger to avoid hammering
      for (const s of servers) {
        if (cancelled) return;
        await pollOne(s.id, s.host);
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    // initial + interval
    void pollAll();
    const interval = setInterval(() => void pollAll(), 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [servers]);

  const pathname = usePathname();

  const activeSystemId = React.useMemo(() => {
    // Matches /systems/<id> and /systems/<id>/anything
    const m = pathname.match(/^\/systems\/([^/]+)(?:\/|$)/);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  }, [pathname]);

  return (
    <Sidebar>
      <SidebarContent className="relative">
        <SidebarGroup>
          <Link href="/">
            <SidebarGroupLabel className="text-xl font-semibold tracking-tight">
              Web Configuration
            </SidebarGroupLabel>
            <SidebarGroupLabel className="text-sm text-zinc-600 dark:text-zinc-400">
              by Dan Thomas
            </SidebarGroupLabel>
          </Link>

          <SidebarSeparator className="my-2" />

          <SidebarGroupContent>
            <TooltipProvider>
              <SidebarMenu>
                <AddSystemDialog
                  onCreated={(created) => {
                    setServers((prev) => [created, ...prev]);
                    setReachabilityById((prev) => ({
                      ...prev,
                      [created.id]: "red",
                    }));
                    setProbeById((prev) => ({
                      ...prev,
                      [created.id]: { server: false, client: false },
                    }));
                    window.dispatchEvent(new Event("server-configs:changed"));
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
                    const isActive = activeSystemId === s.id;
                    const r = reachabilityById[s.id] ?? "red";
                    return (
                      <SidebarMenuItem key={s.id}>
                        <SidebarMenuButton asChild>
                          <Link
                            href={`/systems/${encodeURIComponent(s.id)}`}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-2 transition-colors",
                              "hover:bg-muted/60",
                              isActive &&
                                "bg-muted font-medium ring-1 ring-border",
                            )}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <EthernetPort className={iconClass(r)} />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" align="center">
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <span>Server</span>
                                    <span className="font-medium">
                                      {(probeById[s.id]?.server ?? false)
                                        ? "✓"
                                        : "✗"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span>Client</span>
                                    <span className="font-medium">
                                      {(probeById[s.id]?.client ?? false)
                                        ? "✓"
                                        : "✗"}
                                    </span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>

                            <span className="truncate">{s.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </TooltipProvider>
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
