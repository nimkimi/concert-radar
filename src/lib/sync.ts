import type { Concert, PrismaClient, Source, TrackedArtist, User } from "@prisma/client";
import { activeAdapters as defaultActiveAdapters } from "./sources/registry";
import type { ConcertHit, SourceAdapter } from "./sources/types";
import { groupForDashboard, type DashboardConcert } from "./dedup";
import { normalizeArtistName } from "./normalize";
import { haversineKm } from "./geo";

const FETCH_DELAY_MS = 100;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const COUNTRY_WIDE_RADIUS = 9999;

// Process-wide cache. Keyed on `${source}:${spotifyArtistId}`. Cleared on
// process restart, which is fine for a daily cron with shared rate limits.
const fetchCache = new Map<string, number>();

export type RunSyncOptions = {
  adapters?: SourceAdapter[];
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  clock?: () => number; // for cache TTL (DI to make tests deterministic)
};

export type RunSyncResult = {
  newConcerts: Concert[];
  perSource: Record<Source, { ok: boolean; concertsFound: number; error?: string }>;
};

export async function runSyncForUser(
  prisma: PrismaClient,
  userId: string,
  opts: RunSyncOptions = {},
): Promise<RunSyncResult> {
  const adapters = opts.adapters ?? defaultActiveAdapters();
  const now = opts.now ?? (() => new Date());
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const clock = opts.clock ?? (() => Date.now());

  const artists = await prisma.trackedArtist.findMany({
    where: { userId, isExcluded: false },
  });

  const perSource = {} as RunSyncResult["perSource"];
  const allNewConcerts: Concert[] = [];

  for (const adapter of adapters) {
    const start = clock();
    let concertsFound = 0;
    let error: string | undefined;

    try {
      for (const artist of artists) {
        const cacheKey = `${adapter.source}:${artist.spotifyArtistId}`;
        const last = fetchCache.get(cacheKey) ?? 0;
        if (clock() - last < CACHE_TTL_MS) continue;

        let hits: ConcertHit[] = [];
        try {
          hits = await adapter.fetchForArtist({
            artistName: artist.name,
            spotifyArtistId: artist.spotifyArtistId,
          });
        } catch (err) {
          // Per-artist failure shouldn't abort the whole source — log and
          // skip. The SyncLog FAIL row is reserved for source-wide problems.
          console.warn(`[sync] ${adapter.source} failed for ${artist.name}:`, err);
          continue;
        }
        fetchCache.set(cacheKey, clock());
        concertsFound += hits.length;

        for (const hit of hits) {
          const upserted = await prisma.concert.upsert({
            where: { externalId_source: { externalId: hit.externalId, source: hit.source } },
            create: {
              externalId: hit.externalId,
              source: hit.source,
              artistName: hit.artistName || artist.name,
              venueName: hit.venueName,
              venueCity: hit.venueCity,
              venueCountry: hit.venueCountry,
              venueTimezone: hit.venueTimezone,
              latitude: hit.latitude ?? null,
              longitude: hit.longitude ?? null,
              eventDate: hit.eventDate,
              ticketUrl: hit.ticketUrl ?? null,
              status: hit.status,
            },
            update: {
              eventDate: hit.eventDate,
              ticketUrl: hit.ticketUrl ?? null,
              status: hit.status,
              venueName: hit.venueName,
              venueCity: hit.venueCity,
            },
          });
          // upsert doesn't tell us "was it new" — detect via createdAt.
          if (clock() - upserted.createdAt.getTime() < 60_000) {
            allNewConcerts.push(upserted);
          }
        }
        await sleep(FETCH_DELAY_MS);
      }
      perSource[adapter.source] = { ok: true, concertsFound };
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      perSource[adapter.source] = { ok: false, concertsFound, error };
    }

    await prisma.syncLog.create({
      data: {
        source: adapter.source,
        status: error ? "FAIL" : "OK",
        errorMessage: error ?? null,
        durationMs: clock() - start,
        concertsFound,
      },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastConcertSyncAt: now() },
  });

  return { newConcerts: allNewConcerts, perSource };
}

// Test hook only — clears the in-memory 6h cache.
export function _clearFetchCache(): void {
  fetchCache.clear();
}

// ============================================================
// Dashboard query
// ============================================================

export type DashboardConcertWithDistance = DashboardConcert & {
  distanceKm: number | null;
};

export async function getDedupedConcertsForUser(
  prisma: PrismaClient,
  userId: string,
  opts: { now?: () => Date } = {},
): Promise<DashboardConcertWithDistance[]> {
  const now = (opts.now ?? (() => new Date()))();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  const artists = await prisma.trackedArtist.findMany({
    where: { userId, isExcluded: false },
  });
  if (artists.length === 0) return [];

  const trackedNames = new Set(artists.map((a) => normalizeArtistName(a.name)));

  const concerts = await prisma.concert.findMany({
    where: {
      eventDate: { gt: now },
      status: { not: "CANCELLED" },
    },
  });

  const tracked = concerts.filter((c) =>
    trackedNames.has(normalizeArtistName(c.artistName)),
  );

  const inRange = filterByRadius(tracked, user);
  const grouped = groupForDashboard(inRange);

  return grouped.map((g) => ({
    ...g,
    distanceKm: distanceFor(g.representative, user),
  }));
}

function distanceFor(c: Concert, user: User): number | null {
  if (
    user.latitude == null ||
    user.longitude == null ||
    c.latitude == null ||
    c.longitude == null
  ) {
    return null;
  }
  return haversineKm(
    { lat: user.latitude, lon: user.longitude },
    { lat: c.latitude, lon: c.longitude },
  );
}

function filterByRadius(concerts: Concert[], user: User): Concert[] {
  if (user.radiusKm === COUNTRY_WIDE_RADIUS) {
    return concerts.filter((c) => ["NO", "SE", "DK"].includes(c.venueCountry));
  }
  if (user.latitude == null || user.longitude == null) return concerts;
  return concerts.filter((c) => {
    const d = distanceFor(c, user);
    return d == null || d <= user.radiusKm;
  });
}

// Re-export so consumers don't have to know about the internal split.
export type { DashboardConcert };
export { normalizeArtistName };

// Helper for callers that already have an `artists` list and want to know
// if a tracked artist still has any upcoming row attached.
export function _matchTrackedArtists(
  concerts: Concert[],
  tracked: Pick<TrackedArtist, "name">[],
): Concert[] {
  const names = new Set(tracked.map((a) => normalizeArtistName(a.name)));
  return concerts.filter((c) => names.has(normalizeArtistName(c.artistName)));
}
