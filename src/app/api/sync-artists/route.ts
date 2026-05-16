import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";
import { createSpotifyClient, syncArtistsForUser } from "@/lib/spotify";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("unauthorized", { status: 401 });

  try {
    const client = createSpotifyClient(
      prisma,
      session.user.id,
      process.env.TOKEN_ENCRYPTION_KEY!,
      process.env.SPOTIFY_CLIENT_ID!,
      process.env.SPOTIFY_CLIENT_SECRET!,
    );
    const result = await syncArtistsForUser(prisma, session.user.id, client);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
