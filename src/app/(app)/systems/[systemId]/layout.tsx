import * as React from "react";
import { SystemTopNav } from "@/components/SystemTopNav";

export default async function SystemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ systemId: string }>;
}) {
  const { systemId } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <SystemTopNav systemId={systemId} />
      <div className="flex-1 p-4">{children}</div>
    </div>
  );
}
