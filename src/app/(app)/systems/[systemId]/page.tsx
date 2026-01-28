import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function SystemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const owner = session?.oid ?? session?.upn ?? session?.user?.email ?? null;
  if (!owner) redirect("/login");

  const system = await prisma.serverConfig.findFirst({
    where: { id, ownerUpn: owner },
    select: {
      id: true,
      name: true,
      host: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!system) {
    // If someone navigates to an ID they don't own (or deleted), go home
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="p-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{system.name}</h1>
        <div className="text-sm text-muted-foreground">
          <div>Host: {system.host}</div>
          <div>Username: {system.username}</div>
        </div>
      </div>
    </div>
  );
}
