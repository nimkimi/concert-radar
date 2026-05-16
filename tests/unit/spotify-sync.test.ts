import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { syncArtistsForUser, type ArtistRecord, type SpotifyClient } from "@/lib/spotify";

function makeClient(parts: {
  top?: ArtistRecord[];
  followed?: ArtistRecord[];
  savedAlbums?: ArtistRecord[];
}): SpotifyClient & {
  getTopArtists: ReturnType<typeof vi.fn>;
  getFollowedArtists: ReturnType<typeof vi.fn>;
  getSavedAlbumArtists: ReturnType<typeof vi.fn>;
} {
  return {
    getTopArtists: vi.fn(async () => parts.top ?? []),
    getFollowedArtists: vi.fn(async () => parts.followed ?? []),
    getSavedAlbumArtists: vi.fn(async () => parts.savedAlbums ?? []),
  };
}

function makePrisma() {
  const upserts: { where: any; create: any; update: any }[] = [];
  const userUpdates: any[] = [];
  const prisma = {
    trackedArtist: {
      upsert: vi.fn(async (args: any) => {
        upserts.push(args);
        return { id: "ta_" + upserts.length, ...args.create };
      }),
    },
    user: {
      update: vi.fn(async (args: any) => {
        userUpdates.push(args);
        return { id: args.where.id, ...args.data };
      }),
    },
  } as unknown as PrismaClient;
  return { prisma, upserts, userUpdates };
}

const A = (id: string, name = id): ArtistRecord => ({
  spotifyArtistId: id,
  name,
  imageUrl: null,
  genres: "",
});

describe("syncArtistsForUser", () => {
  it("upserts top + followed, deduped by spotifyArtistId", async () => {
    const client = makeClient({
      top: [A("a"), A("b"), A("c"), A("d"), A("e")],
      followed: [A("b"), A("f")],
    });
    const { prisma, upserts, userUpdates } = makePrisma();

    const result = await syncArtistsForUser(prisma, "user_1", client);

    expect(result.upserted).toBe(6);
    expect(result.fallbackTriggered).toBe(false);
    expect(client.getSavedAlbumArtists).not.toHaveBeenCalled();
    expect(upserts).toHaveLength(6);
    expect(upserts[0].where).toEqual({
      userId_spotifyArtistId: { userId: "user_1", spotifyArtistId: "a" },
    });
    expect(userUpdates).toHaveLength(1);
    expect(userUpdates[0].data.lastArtistSyncAt).toBeInstanceOf(Date);
  });

  it("triggers saved-album fallback when top+followed combined < 5 distinct", async () => {
    const client = makeClient({
      top: [A("a"), A("b")],
      followed: [A("b"), A("c")],
      savedAlbums: [A("d"), A("e"), A("c")],
    });
    const { prisma, upserts } = makePrisma();

    const result = await syncArtistsForUser(prisma, "user_1", client);

    expect(result.fallbackTriggered).toBe(true);
    expect(client.getSavedAlbumArtists).toHaveBeenCalledOnce();
    expect(result.upserted).toBe(5);
    expect(upserts.map((u) => u.create.spotifyArtistId).sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("does not duplicate artists already seen across all three sources", async () => {
    const client = makeClient({
      top: [A("x")],
      followed: [A("x")],
      savedAlbums: [A("x"), A("y"), A("z"), A("w")],
    });
    const { prisma, upserts } = makePrisma();

    const result = await syncArtistsForUser(prisma, "user_1", client);

    expect(result.fallbackTriggered).toBe(true);
    expect(result.upserted).toBe(4);
    expect(new Set(upserts.map((u) => u.create.spotifyArtistId)).size).toBe(4);
  });

  it("passes name, imageUrl, genres through to upsert payloads", async () => {
    const client = makeClient({
      top: [
        {
          spotifyArtistId: "rad",
          name: "Radiohead",
          imageUrl: "https://example.com/r.jpg",
          genres: "alternative rock,art rock",
        },
      ],
      followed: [A("b"), A("c"), A("d"), A("e")],
    });
    const { prisma, upserts } = makePrisma();

    await syncArtistsForUser(prisma, "user_1", client);

    const rad = upserts.find((u) => u.create.spotifyArtistId === "rad");
    expect(rad?.create.name).toBe("Radiohead");
    expect(rad?.create.imageUrl).toBe("https://example.com/r.jpg");
    expect(rad?.create.genres).toBe("alternative rock,art rock");
    expect(rad?.update.name).toBe("Radiohead");
  });
});
