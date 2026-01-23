import { Plus, EthernetPort } from "lucide-react";

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
import { Button } from "./ui/button";

// Menu items.
const items = [
  {
    title: "IP Netix",
    url: "#",
    icon: EthernetPort,
    status: "connected",
  },
  {
    title: "Lab",
    url: "#",
    icon: EthernetPort,
    status: "disconnected",
  },
];

export default function SideBar() {
  return (
    <Sidebar>
      <SidebarContent>
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
              <Button variant="outline">
                <Plus />
                Add System
              </Button>
              <SidebarSeparator className="my-2" />
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon
                        className={
                          item.status === "disconnected"
                            ? "text-red-600 animate-[pulse_1.5s_ease-in-out_infinite]"
                            : "text-green-600"
                        }
                      />

                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
