import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const owner = session?.oid;

  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.serverConfig.findMany({
    where: { ownerUpn: owner },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      host: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const owner = session?.oid;

  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const host = typeof b.host === "string" ? b.host.trim() : "";
  const username = typeof b.username === "string" ? b.username.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!name || !host || !username || !password) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const enc = encryptSecret(password);

  const created = await prisma.serverConfig.create({
    data: {
      ownerUpn: owner,
      name,
      host,
      username,
      ...enc,
    },
    select: {
      id: true,
      name: true,
      host: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
