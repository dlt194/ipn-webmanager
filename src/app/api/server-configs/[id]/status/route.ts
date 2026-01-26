import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import net from "node:net";

export const runtime = "nodejs";

function normalizeHost(host: string) {
  return host.replace(/^https?:\/\//, "");
}

async function checkPort(
  host: string,
  port: number,
  timeoutMs = 2500,
): Promise<{ reachable: boolean }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const onError = () => {
      socket.destroy();
      resolve({ reachable: false });
    };

    socket.setTimeout(timeoutMs);
    socket.once("error", onError);
    socket.once("timeout", onError);

    socket.connect(port, host, () => {
      socket.end();
      resolve({ reachable: true });
    });
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const owner = session?.oid ?? null;
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfg = await prisma.serverConfig.findFirst({
    where: { id, ownerUpn: owner },
    select: { host: true },
  });

  if (!cfg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const host = normalizeHost(cfg.host);

  // Choose the port you care about
  const PORT = 7070; // change per system type later

  const result = await checkPort(host, PORT);

  return NextResponse.json({
    serverReachable: result.reachable,
    checkedAt: new Date().toISOString(),
  });
}
