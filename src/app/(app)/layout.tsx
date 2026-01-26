import { SidebarProvider } from "@/components/ui/sidebar";
import SideBar from "@/components/SideBar";
import { ClientOnly } from "@/components/ClientOnly";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ClientOnly>
        <SideBar />
      </ClientOnly>
      <main className="flex-1">{children}</main>
    </SidebarProvider>
  );
}
