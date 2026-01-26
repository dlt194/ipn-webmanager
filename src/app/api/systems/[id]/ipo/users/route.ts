import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth-options";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { ipoAuthenticate, ipoRequestJson } from "@/lib/ipo-client";

export const runtime = "nodejs";

type UsersResponse = unknown; // you can type this later once you decide shape you consume

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const owner = session?.oid ?? session?.upn ?? session?.user?.email ?? null;
  if (!owner)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cfg = await prisma.serverConfig.findFirst({
    where: { id, ownerUpn: owner },
    select: {
      host: true,
      username: true,
      pwdCipher: true,
      pwdIv: true,
      pwdTag: true,
    },
  });

  if (!cfg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const password = decryptSecret({
    pwdCipher: cfg.pwdCipher,
    pwdIv: cfg.pwdIv,
    pwdTag: cfg.pwdTag,
  });

  // 1) establish session with IPO
  const auth = await ipoAuthenticate({
    host: cfg.host,
    username: cfg.username,
    password,
    allowInsecureTls: true, // dev/on-prem; make this a per-system flag later
  });

  // 2) call Users endpoint
  // PDF: /ws/sdk/admin/v1/users and optional ipaddress parameter :contentReference[oaicite:7]{index=7}
  const data = await ipoRequestJson<UsersResponse>({
    host: cfg.host,
    auth,
    path: `/admin/v1/users`,
    allowInsecureTls: true,
  });

  return NextResponse.json(data);
}
