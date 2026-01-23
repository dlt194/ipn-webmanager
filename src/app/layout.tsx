import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { SidebarProvider } from "@/components/ui/sidebar";
import SideBar from "@/components/SideBar";
import { ThemeProvider } from "@/components/theme-provider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "IP Netix Web Manager for IP Office",
  description: "Created by Dan Thomas",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const isSignedIn = !!session;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jetbrainsMono.className} min-h-screen antialiased bg-background`}
      >
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {isSignedIn ? (
              <SidebarProvider>
                <SideBar />
                <main className="flex-1 bg-slate-50 dark:bg-[#1e2939]">
                  {children}
                </main>
              </SidebarProvider>
            ) : (
              // 🔑 Logged out: let page fully control layout
              <main className="min-h-screen flex items-center justify-center">
                {children}
              </main>
            )}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
