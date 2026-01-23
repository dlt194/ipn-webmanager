import { SidebarProvider } from "@/components/ui/sidebar";
import SideBar from "@/components/SideBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SideBar />
      <main className="flex-1">{children}</main>
    </SidebarProvider>
  );
}
