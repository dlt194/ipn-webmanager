import type { Metadata } from "next";
import { Space_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { SidebarProvider } from "@/components/ui/sidebar";
import SideBar from "@/components/SideBar";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IP Netix Web Manager for IP Office",
  description: "Created by Dan Thomas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body
        className={`${spaceMono.className} min-h-screen bg-zinc-50 antialiased dark:bg-black`}
      >
        <Providers>
          <SidebarProvider>
            <SideBar />
            <main>{children}</main>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
