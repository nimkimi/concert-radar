import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { runSyncForUser, getDedupedConcertsForUser } from "@/lib/sync";
import {
  createSpotifyClient,
  syncArtistsForUser,
} from "@/lib/spotify";
import {
  filterUnsent,
  recordAndSendDigest,
  recordAndSendInstant,
} from "@/lib/email";

// Vercel Cron hits this as GET; we also accept POST for manual triggering.
async function handler(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new NextResponse("CRON_SECRET not configured", { status: 500 });

  const provided = req.headers.get("authorization");
  if (provided !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const users = await prisma.user.findMany();
  const report = {
    users: users.length,
    artistsSynced: 0,
    concertsSynced: 0,
    digestsSent: 0,
    instantsSent: 0,
    errors: [] as { userId: string; message: string }[],
  };

  for (const user of users) {
    try {
      // Refresh artists, then concerts.
      const spotify = createSpotifyClient(
        prisma,
        user.id,
        process.env.TOKEN_ENCRYPTION_KEY!,
        process.env.SPOTIFY_CLIENT_ID!,
        process.env.SPOTIFY_CLIENT_SECRET!,
      );
      const artistResult = await syncArtistsForUser(prisma, user.id, spotify);
      report.artistsSynced += artistResult.upserted;

      const syncResult = await runSyncForUser(prisma, user.id);
      report.concertsSynced += syncResult.newConcerts.length;

      if (!user.notificationsEnabled) continue;

      // Notification candidates: every upcoming, in-radius concert this user
      // hasn't been notified about yet. Using the dedup query keeps us aligned
      // with what the dashboard shows.
      const groups = await getDedupedConcertsForUser(prisma, user.id);
      const candidates = groups.map((g) => g.representative);
      const unsent = await filterUnsent(prisma, user.id, candidates);

      if (unsent.length === 0) continue;

      if (user.notificationFrequency === "DAILY_DIGEST") {
        const r = await recordAndSendDigest(prisma, user, unsent);
        if (r.sent) report.digestsSent += 1;
      } else {
        for (const c of unsent) {
          const r = await recordAndSendInstant(prisma, user, c);
          if (r.sent) report.instantsSent += 1;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.errors.push({ userId: user.id, message });
      console.error(`[cron] user ${user.id} failed:`, err);
    }
  }

  return NextResponse.json(report);
}

export const GET = handler;
export const POST = handler;
