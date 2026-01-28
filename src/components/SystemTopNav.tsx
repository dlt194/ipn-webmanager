"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

type Props = {
  systemId: string;
};

const sections = [
  { label: "Overview", href: "" },
  { label: "Users", href: "users" },
  { label: "Extensions", href: "extensions" },
  { label: "Hunt Groups", href: "hunt-groups" },
  { label: "SIP Lines", href: "sip-lines" },
  { label: "Short Codes", href: "short-codes" },
  { label: "Incoming Call Routes", href: "incoming-call-routes" },
  { label: "Incoming Group IDs", href: "incoming-group-ids" },
  { label: "Licenses", href: "licenses" },
  { label: "Nodes", href: "nodes" },
  { label: "Provision IP", href: "provision-ip" },
  { label: "Settings", href: "settings" },
] as const;

export function SystemTopNav({ systemId }: Props) {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center px-4">
        <NavigationMenu>
          <NavigationMenuList className="gap-1">
            {sections.map((s) => {
              const href = `/systems/${encodeURIComponent(systemId)}${
                s.href ? `/${s.href}` : ""
              }`;

              const active =
                pathname === href ||
                (s.href === "" &&
                  pathname === `/systems/${encodeURIComponent(systemId)}`);

              return (
                <NavigationMenuItem key={s.label}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={href}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm transition-colors",
                        "hover:bg-muted/60",
                        active && "bg-muted font-medium",
                      )}
                    >
                      {s.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right-side actions slot (optional): delete, refresh, etc. */}
        <div className="ml-auto">{/* actions */}</div>
      </div>
    </div>
  );
}
