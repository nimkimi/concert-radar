import type { PrismaClient } from "@prisma/client";
import { getAccountTokens } from "@/lib/auth/encrypted-adapter";
import { encrypt } from "@/lib/crypto";

export type ArtistRecord = {
  spotifyArtistId: string;
  name: string;
  imageUrl: string | null;
  genres: string;
};

type RawArtist = {
  id?: string;
  name?: string;
  images?: { url?: string }[];
  genres?: string[];
};

function mapArtist(raw: RawArtist, imageFallback: string | null = null): ArtistRecord | null {
  if (!raw?.id || !raw?.name) return null;
  return {
    spotifyArtistId: raw.id,
    name: raw.name,
    imageUrl: raw.images?.[0]?.url ?? imageFallback,
    genres: Array.isArray(raw.genres) ? raw.genres.join(",") : "",
  };
}

export function parseTopArtists(json: unknown): ArtistRecord[] {
  const items = (json as { items?: RawArtist[] })?.items;
  if (!Array.isArray(items)) return [];
  return items.map((r) => mapArtist(r)).filter((a): a is ArtistRecord => a !== null);
}

export function parseFollowedArtists(json: unknown): ArtistRecord[] {
  const items = (json as { artists?: { items?: RawArtist[] } })?.artists?.items;
  if (!Array.isArray(items)) return [];
  return items.map((r) => mapArtist(r)).filter((a): a is ArtistRecord => a !== null);
}

type SavedAlbum = {
  album?: {
    artists?: RawArtist[];
    images?: { url?: string }[];
  };
};

export function parseSavedAlbumArtists(json: unknown): ArtistRecord[] {
  const items = (json as { items?: SavedAlbum[] })?.items;
  if (!Array.isArray(items)) return [];
  const seen = new Map<string, ArtistRecord>();
  for (const item of items) {
    const albumImg = item.album?.images?.[0]?.url ?? null;
    for (const raw of item.album?.artists ?? []) {
      const mapped = mapArtist(raw, albumImg);
      if (mapped && !seen.has(mapped.spotifyArtistId)) {
        seen.set(mapped.spotifyArtistId, mapped);
      }
    }
  }
  return [...seen.values()];
}

// ============================================================
// Network layer
// ============================================================

const API = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface SpotifyClient {
  getTopArtists(): Promise<ArtistRecord[]>;
  getFollowedArtists(): Promise<ArtistRecord[]>;
  getSavedAlbumArtists(): Promise<ArtistRecord[]>;
}

type FetchJson = (path: string) => Promise<unknown>;

function makeClient(fetchJson: FetchJson): SpotifyClient {
  return {
    async getTopArtists() {
      return parseTopArtists(
        await fetchJson("/me/top/artists?limit=50&time_range=medium_term"),
      );
    },
    async getFollowedArtists() {
      return parseFollowedArtists(await fetchJson("/me/following?type=artist&limit=50"));
    },
    async getSavedAlbumArtists() {
      return parseSavedAlbumArtists(await fetchJson("/me/albums?limit=50"));
    },
  };
}

export function createSpotifyClient(
  prisma: PrismaClient,
  userId: string,
  keyHex: string,
  clientId: string,
  clientSecret: string,
): SpotifyClient {
  return makeClient(async (path) => {
    const res = await spotifyFetch(prisma, userId, keyHex, clientId, clientSecret, path);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Spotify ${res.status} on ${path}: ${body.slice(0, 200)}`);
    }
    return res.json();
  });
}

async function spotifyFetch(
  prisma: PrismaClient,
  userId: string,
  keyHex: string,
  clientId: string,
  clientSecret: string,
  path: string,
): Promise<Response> {
  let tokens = await getAccountTokens(prisma, userId, keyHex);
  if (!tokens?.accessToken) throw new Error("no spotify access token for user");

  let res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  });

  if (res.status === 401 && tokens.refreshToken) {
    const refreshed = await refreshAccessToken(tokens.refreshToken, clientId, clientSecret);
    await writeRefreshedTokens(prisma, userId, keyHex, refreshed);
    res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${refreshed.accessToken}` },
    });
  }
  return res;
}

type RefreshResult = { accessToken: string; refreshToken: string | null; expiresAt: number };

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<RefreshResult> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body,
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
  };
}

async function writeRefreshedTokens(
  prisma: PrismaClient,
  userId: string,
  keyHex: string,
  refreshed: RefreshResult,
): Promise<void> {
  await prisma.account.updateMany({
    where: { userId, provider: "spotify" },
    data: {
      access_token: encrypt(refreshed.accessToken, keyHex),
      ...(refreshed.refreshToken
        ? { refresh_token: encrypt(refreshed.refreshToken, keyHex) }
        : {}),
      expires_at: refreshed.expiresAt,
    },
  });
}

// ============================================================
// Orchestration — top + followed, with saved-album fallback if < 5
// ============================================================

export type SyncArtistsResult = {
  fromTop: number;
  fromFollowed: number;
  fromSavedAlbums: number;
  upserted: number;
  fallbackTriggered: boolean;
};

export async function syncArtistsForUser(
  prisma: PrismaClient,
  userId: string,
  client: SpotifyClient,
): Promise<SyncArtistsResult> {
  const [top, followed] = await Promise.all([
    client.getTopArtists(),
    client.getFollowedArtists(),
  ]);

  const dedup = new Map<string, ArtistRecord>();
  for (const a of [...top, ...followed]) {
    if (!dedup.has(a.spotifyArtistId)) dedup.set(a.spotifyArtistId, a);
  }

  let fromSavedAlbums = 0;
  let fallbackTriggered = false;
  if (dedup.size < 5) {
    fallbackTriggered = true;
    const fromAlbums = await client.getSavedAlbumArtists();
    fromSavedAlbums = fromAlbums.length;
    for (const a of fromAlbums) {
      if (!dedup.has(a.spotifyArtistId)) dedup.set(a.spotifyArtistId, a);
    }
  }

  const all = [...dedup.values()];
  await Promise.all(
    all.map((a) =>
      prisma.trackedArtist.upsert({
        where: {
          userId_spotifyArtistId: { userId, spotifyArtistId: a.spotifyArtistId },
        },
        create: {
          userId,
          spotifyArtistId: a.spotifyArtistId,
          name: a.name,
          imageUrl: a.imageUrl,
          genres: a.genres,
        },
        update: {
          name: a.name,
          imageUrl: a.imageUrl,
          genres: a.genres,
        },
      }),
    ),
  );

  await prisma.user.update({
    where: { id: userId },
    data: { lastArtistSyncAt: new Date() },
  });

  return {
    fromTop: top.length,
    fromFollowed: followed.length,
    fromSavedAlbums,
    upserted: all.length,
    fallbackTriggered,
  };
}
