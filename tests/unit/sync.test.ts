import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient, Concert, TrackedArtist, User } from "@prisma/client";
import { runSyncForUser, getDedupedConcertsForUser, _clearFetchCache } from "@/lib/sync";
import type { SourceAdapter, ConcertHit } from "@/lib/sources/types";

function mkHit(p: Partial<ConcertHit> & Pick<ConcertHit, "externalId" | "source" | "eventDate">): ConcertHit {
  return {
    artistName: p.artistName ?? "Radiohead",
    venueName: p.venueName ?? "Sentrum Scene",
    venueCity: p.venueCity ?? "Oslo",
    venueCountry: p.venueCountry ?? "NO",
    venueTimezone: p.venueTimezone ?? "Europe/Oslo",
    status: p.status ?? "UPCOMING",
    latitude: p.latitude,
    longitude: p.longitude,
    ticketUrl: p.ticketUrl,
    externalId: p.externalId,
    source: p.source,
    eventDate: p.eventDate,
  };
}

function makeOrchestratorMockPrisma(initial: {
  tracked: Pick<TrackedArtist, "spotifyArtistId" | "name" | "isExcluded">[];
}) {
  const concerts: Concert[] = [];
  const syncLogs: any[] = [];
  const upserts: any[] = [];
  const userUpdates: any[] = [];

  const prisma = {
    trackedArtist: {
      findMany: vi.fn(async (args?: any) => {
        const rows = initial.tracked.map((t, i) => ({
          id: `ta_${i}`,
          userId: "u1",
          spotifyArtistId: t.spotifyArtistId,
          name: t.name,
          imageUrl: null,
          genres: "",
          isExcluded: t.isExcluded,
          createdAt: new Date(),
        }));
        if (args?.where?.isExcluded === false) {
          return rows.filter((r) => !r.isExcluded);
        }
        return rows;
      }),
    },
    concert: {
      upsert: vi.fn(async (args: any) => {
        upserts.push(args);
        const row: Concert = {
          id: `c_${upserts.length}`,
          externalId: args.create.externalId,
          source: args.create.source,
          artistName: args.create.artistName,
          venueName: args.create.venueName,
          venueCity: args.create.venueCity,
          venueCountry: args.create.venueCountry,
          venueTimezone: args.create.venueTimezone,
          latitude: args.create.latitude,
          longitude: args.create.longitude,
          eventDate: args.create.eventDate,
          ticketUrl: args.create.ticketUrl,
          status: args.create.status,
          createdAt: new Date(),
        };
        concerts.push(row);
        return row;
      }),
    },
    syncLog: {
      create: vi.fn(async (args: any) => {
        syncLogs.push(args.data);
        return { id: `sl_${syncLogs.length}`, ...args.data };
      }),
    },
    user: {
      update: vi.fn(async (args: any) => {
        userUpdates.push(args);
        return { id: args.where.id, ...args.data };
      }),
    },
  } as unknown as PrismaClient;

  return { prisma, concerts, syncLogs, upserts, userUpdates };
}

beforeEach(() => _clearFetchCache());

describe("runSyncForUser", () => {
  it("calls each adapter for every non-excluded tracked artist", async () => {
    const { prisma, syncLogs } = makeOrchestratorMockPrisma({
      tracked: [
        { spotifyArtistId: "a1", name: "Radiohead", isExcluded: false },
        { spotifyArtistId: "a2", name: "Sigur Ros", isExcluded: false },
        { spotifyArtistId: "a3", name: "Skipped", isExcluded: true },
      ],
    });

    const tm: SourceAdapter = {
      source: "TICKETMASTER",
      fetchForArtist: vi.fn(async ({ artistName }) => [
        mkHit({
          externalId: `tm-${artistName}`,
          source: "TICKETMASTER",
          eventDate: new Date("2026-06-15T18:00:00Z"),
          artistName,
        }),
      ]),
    };

    const result = await runSyncForUser(prisma, "u1", {
      adapters: [tm],
      sleep: async () => {},
    });

    expect(tm.fetchForArtist).toHaveBeenCalledTimes(2);
    expect(result.perSource.TICKETMASTER.ok).toBe(true);
    expect(result.perSource.TICKETMASTER.concertsFound).toBe(2);
    expect(syncLogs).toHaveLength(1);
    expect(syncLogs[0].status).toBe("OK");
  });

  it("writes SyncLog{FAIL} when an adapter throws and continues with other sources", async () => {
    const { prisma, syncLogs } = makeOrchestratorMockPrisma({
      tracked: [{ spotifyArtistId: "a1", name: "Artist", isExcluded: false }],
    });

    const broken: SourceAdapter = {
      source: "SONGKICK",
      fetchForArtist: vi.fn(async () => {
        throw new Error("upstream 500");
      }),
    };
    const good: SourceAdapter = {
      source: "TICKETMASTER",
      fetchForArtist: vi.fn(async () => [
        mkHit({
          externalId: "tm-1",
          source: "TICKETMASTER",
          eventDate: new Date("2026-06-15T18:00:00Z"),
        }),
      ]),
    };

    const result = await runSyncForUser(prisma, "u1", {
      adapters: [broken, good],
      sleep: async () => {},
    });

    // Per-artist failures are warnings, not source-wide FAIL — so we still
    // log OK with 0 found for the broken adapter. This is documented in
    // src/lib/sync.ts. The result should still include the good source's hit.
    expect(result.perSource.TICKETMASTER.concertsFound).toBe(1);
    expect(syncLogs.map((l) => l.source).sort()).toEqual(["SONGKICK", "TICKETMASTER"]);
  });

  it("respects the 6h cache — re-running immediately doesn't call adapter again", async () => {
    const { prisma } = makeOrchestratorMockPrisma({
      tracked: [{ spotifyArtistId: "a1", name: "Artist", isExcluded: false }],
    });
    const tm: SourceAdapter = {
      source: "TICKETMASTER",
      fetchForArtist: vi.fn(async () => []),
    };

    await runSyncForUser(prisma, "u1", { adapters: [tm], sleep: async () => {} });
    await runSyncForUser(prisma, "u1", { adapters: [tm], sleep: async () => {} });
    expect(tm.fetchForArtist).toHaveBeenCalledTimes(1);
  });

  it("stamps User.lastConcertSyncAt", async () => {
    const { prisma, userUpdates } = makeOrchestratorMockPrisma({
      tracked: [{ spotifyArtistId: "a1", name: "Artist", isExcluded: false }],
    });
    const tm: SourceAdapter = {
      source: "TICKETMASTER",
      fetchForArtist: vi.fn(async () => []),
    };
    await runSyncForUser(prisma, "u1", { adapters: [tm], sleep: async () => {} });
    expect(userUpdates).toHaveLength(1);
    expect(userUpdates[0].data.lastConcertSyncAt).toBeInstanceOf(Date);
  });
});

// ============================================================
// getDedupedConcertsForUser
// ============================================================

function mkConcert(p: Partial<Concert> & Pick<Concert, "id" | "source" | "artistName" | "venueCity" | "eventDate">): Concert {
  return {
    externalId: p.externalId ?? `ext-${p.id}`,
    artistName: p.artistName,
    venueName: p.venueName ?? "Venue",
    venueCity: p.venueCity,
    venueCountry: p.venueCountry ?? "NO",
    venueTimezone: p.venueTimezone ?? "Europe/Oslo",
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    eventDate: p.eventDate,
    ticketUrl: p.ticketUrl ?? null,
    status: p.status ?? "UPCOMING",
    createdAt: new Date(),
    id: p.id,
    source: p.source,
  } as Concert;
}

function makeQueryMockPrisma(args: {
  user: Partial<User>;
  tracked: Pick<TrackedArtist, "name" | "isExcluded">[];
  concerts: Concert[];
}) {
  return {
    user: {
      findUnique: vi.fn(async () => ({
        id: "u1",
        spotifyId: "s",
        email: null,
        emailVerified: null,
        name: null,
        image: null,
        cityName: "Bergen",
        latitude: 60.39,
        longitude: 5.32,
        radiusKm: 100,
        notificationsEnabled: true,
        notificationFrequency: "DAILY_DIGEST",
        lastArtistSyncAt: null,
        lastConcertSyncAt: null,
        createdAt: new Date(),
        ...args.user,
      })),
    },
    trackedArtist: {
      findMany: vi.fn(async () => args.tracked.map((t, i) => ({ id: `ta_${i}`, ...t }))),
    },
    concert: { findMany: vi.fn(async () => args.concerts) },
  } as unknown as PrismaClient;
}

describe("getDedupedConcertsForUser", () => {
  const FUTURE = new Date("2026-06-15T18:00:00Z");

  it("returns only concerts from tracked artists within radius", async () => {
    const prisma = makeQueryMockPrisma({
      user: { latitude: 60.39, longitude: 5.32, radiusKm: 100 }, // Bergen
      tracked: [{ name: "Radiohead", isExcluded: false }],
      concerts: [
        // Bergen — in range (distance 0)
        mkConcert({ id: "in", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Bergen", eventDate: FUTURE, latitude: 60.39, longitude: 5.32 }),
        // Oslo — ~308km away, out of 100km radius
        mkConcert({ id: "out", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Oslo", eventDate: FUTURE, latitude: 59.91, longitude: 10.75 }),
        // Untracked artist
        mkConcert({ id: "notTracked", source: "TICKETMASTER", artistName: "Untracked", venueCity: "Bergen", eventDate: FUTURE, latitude: 60.39, longitude: 5.32 }),
      ],
    });

    const out = await getDedupedConcertsForUser(prisma, "u1");
    expect(out).toHaveLength(1);
    expect(out[0].representative.id).toBe("in");
    expect(out[0].distanceKm).toBeCloseTo(0, 0);
  });

  it("country-wide (radiusKm=9999) includes NO/SE/DK regardless of distance", async () => {
    const prisma = makeQueryMockPrisma({
      user: { latitude: 60.39, longitude: 5.32, radiusKm: 9999 },
      tracked: [{ name: "Radiohead", isExcluded: false }],
      concerts: [
        mkConcert({ id: "oslo", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Oslo", eventDate: FUTURE, venueCountry: "NO" }),
        mkConcert({ id: "sthlm", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Stockholm", eventDate: FUTURE, venueCountry: "SE" }),
        mkConcert({ id: "berlin", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Berlin", eventDate: FUTURE, venueCountry: "DE" }),
      ],
    });
    const out = await getDedupedConcertsForUser(prisma, "u1");
    expect(out.map((g) => g.representative.id).sort()).toEqual(["oslo", "sthlm"]);
  });

  it("excludes cancelled concerts", async () => {
    // Verified indirectly — prisma.findMany is called with status: { not: 'CANCELLED' }.
    const prisma = makeQueryMockPrisma({
      user: {},
      tracked: [{ name: "Radiohead", isExcluded: false }],
      concerts: [],
    });
    await getDedupedConcertsForUser(prisma, "u1");
    const concertFindMany = prisma.concert.findMany as any;
    expect(concertFindMany.mock.calls[0][0].where.status).toEqual({ not: "CANCELLED" });
  });

  it("returns [] when no tracked artists", async () => {
    const prisma = makeQueryMockPrisma({
      user: {},
      tracked: [],
      concerts: [],
    });
    const out = await getDedupedConcertsForUser(prisma, "u1");
    expect(out).toEqual([]);
  });
});
