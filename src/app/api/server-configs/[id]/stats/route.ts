import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { ipoRequestText, ipoWithSession } from "@/lib/ipo-client";
import { resolveOwner } from "@/lib/auth";
import { computeUserStats } from "@/lib/stats";

export const runtime = "nodejs";

async function loadConfigForOwner(id: string) {
  const session = await getServerSession(authOptions);
  const owner = resolveOwner(session);
  if (!owner) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const cfg = await prisma.serverConfig.findFirst({
    where: { id, ownerUpn: owner },
    select: {
      id: true,
      host: true,
      username: true,
      pwdCipher: true,
      pwdIv: true,
      pwdTag: true,
    },
  });

  if (!cfg) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const password = decryptSecret({
    pwdCipher: cfg.pwdCipher,
    pwdIv: cfg.pwdIv,
    pwdTag: cfg.pwdTag,
  });

  return { cfg, password, owner };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const loaded = await loadConfigForOwner(id);
  if ("error" in loaded) return loaded.error;

  const baseline = await prisma.serverStatsBaseline.findUnique({
    where: {
      serverConfigId_ownerUpn: {
        serverConfigId: id,
        ownerUpn: loaded.owner,
      },
    },
  });

  return NextResponse.json({ baseline });
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const loaded = await loadConfigForOwner(id);
  if ("error" in loaded) return loaded.error;

  const { cfg, password, owner } = loaded;

  const { text } = await ipoWithSession({
    host: cfg.host,
    username: cfg.username,
    password,
    allowInsecureTls: true,
    run: (auth) =>
      ipoRequestText({
        host: cfg.host,
        auth,
        path: "/admin/v1/users",
        allowInsecureTls: true,
      }),
  });

  const stats = computeUserStats(text);
  const now = new Date();

  const baseline = await prisma.serverStatsBaseline.upsert({
    where: {
      serverConfigId_ownerUpn: {
        serverConfigId: id,
        ownerUpn: owner,
      },
    },
    update: {
      totalUsers: stats.totalUsers,
      licensedCount: stats.licensedCount,
      statsJson: stats,
      lastSyncedAt: now,
    },
    create: {
      serverConfigId: id,
      ownerUpn: owner,
      totalUsers: stats.totalUsers,
      licensedCount: stats.licensedCount,
      statsJson: stats,
      lastSyncedAt: now,
    },
  });

  return NextResponse.json({ baseline }, { status: 200 });
}
