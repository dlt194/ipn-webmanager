import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const ownerOid = session?.oid;

  if (!ownerOid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exists = await prisma.serverConfig.findFirst({
    where: { id, ownerUpn: ownerOid },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.serverConfig.delete({ where: { id } });

  return NextResponse.json({ ok: true }, { status: 200 });
}
