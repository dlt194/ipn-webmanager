import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeHost(host: string) {
  if (host.startsWith("http://") || host.startsWith("https://")) return host;
  return `https://${host}`;
}

async function ping(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
    });

    return { reachable: res.ok, statusCode: res.status };
  } catch {
    return { reachable: false, statusCode: null as number | null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const upn = session?.oid ?? session?.upn ?? session?.user?.email ?? null;

  if (!upn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = await prisma.serverConfig.findFirst({
    where: { id, ownerUpn: upn },
    select: { host: true },
  });

  if (!cfg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const target = normalizeHost(cfg.host);
  const result = await ping(target);

  return NextResponse.json({
    reachable: result.reachable,
    statusCode: result.statusCode,
    checkedAt: new Date().toISOString(),
  });
}
