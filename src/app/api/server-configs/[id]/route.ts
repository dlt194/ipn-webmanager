import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import type { Prisma } from "@/generated/prisma/client";
import { resolveOwner } from "@/lib/auth";

export const runtime = "nodejs";

type PatchBody = {
  name?: string;
  host?: string;
  username?: string;
  password?: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const owner = resolveOwner(session);

  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.serverConfig.findFirst({
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

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const owner = resolveOwner(session);

  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const host = typeof body.host === "string" ? body.host.trim() : "";
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !host || !username) {
    return NextResponse.json(
      { error: "name, host, and username are required" },
      { status: 400 },
    );
  }

  const exists = await prisma.serverConfig.findFirst({
    where: { id, ownerUpn: owner },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Prisma.ServerConfigUpdateInput = { name, host, username };

  if (password.trim().length > 0) {
    const enc = encryptSecret(password);
    data.pwdCipher = enc.pwdCipher;
    data.pwdIv = enc.pwdIv;
    data.pwdTag = enc.pwdTag;
  }

  const updated = await prisma.serverConfig.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      host: true,
      username: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const owner = resolveOwner(session);

  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exists = await prisma.serverConfig.findFirst({
    where: { id, ownerUpn: owner },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.serverConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
