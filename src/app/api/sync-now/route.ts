import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";
import { runSyncForUser } from "@/lib/sync";

const RATE_LIMIT_MS = 5 * 60 * 1000;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lastConcertSyncAt: true },
  });
  if (!user) return new NextResponse("user not found", { status: 404 });

  if (user.lastConcertSyncAt) {
    const elapsed = Date.now() - user.lastConcertSyncAt.getTime();
    if (elapsed < RATE_LIMIT_MS) {
      const retryAfterSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
      return NextResponse.json(
        { error: "rate_limited", retryAfterSec },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }
  }

  try {
    const result = await runSyncForUser(prisma, session.user.id);
    return NextResponse.json({
      newConcerts: result.newConcerts.length,
      perSource: result.perSource,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
