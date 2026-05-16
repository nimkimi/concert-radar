import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseTopArtists,
  parseFollowedArtists,
  parseSavedAlbumArtists,
} from "@/lib/spotify";

const fix = (p: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../__fixtures__/spotify", p), "utf8"));

const topArtists = fix("top-artists.json");
const followed = fix("followed-artists.json");
const savedAlbums = fix("saved-albums.json");

describe("parseTopArtists", () => {
  it("maps id, name, imageUrl, genres", () => {
    const out = parseTopArtists(topArtists);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({
      spotifyArtistId: "0OdUWJ0sBjDrqHygGUXeCF",
      name: "Band of Horses",
      imageUrl: "https://i.scdn.co/image/large.jpg",
      genres: "indie rock,alternative country",
    });
  });

  it("handles missing images and empty genres", () => {
    const out = parseTopArtists(topArtists);
    expect(out[2]).toEqual({
      spotifyArtistId: "6FBDaR13swtiWwGhX1WQsP",
      name: "Blackbriar",
      imageUrl: null,
      genres: "",
    });
  });

  it("returns [] on malformed payload", () => {
    expect(parseTopArtists({})).toEqual([]);
    expect(parseTopArtists(null)).toEqual([]);
  });
});

describe("parseFollowedArtists", () => {
  it("reads from artists.items", () => {
    const out = parseFollowedArtists(followed);
    expect(out).toHaveLength(2);
    expect(out[0].spotifyArtistId).toBe("4Z8W4fKeB5YxbusRsdQVPb");
    expect(out[1].name).toBe("Arctic Monkeys");
  });

  it("returns [] on malformed payload", () => {
    expect(parseFollowedArtists({})).toEqual([]);
    expect(parseFollowedArtists({ artists: {} })).toEqual([]);
  });
});

describe("parseSavedAlbumArtists", () => {
  it("flattens album.artists across all items", () => {
    const out = parseSavedAlbumArtists(savedAlbums);
    const ids = out.map((a) => a.spotifyArtistId);
    expect(ids).toContain("4Z8W4fKeB5YxbusRsdQVPb");
    expect(ids).toContain("2y8Jo9CKhJvtfeKOsYzRdT");
    expect(ids).toContain("artist_a");
    expect(ids).toContain("artist_b");
  });

  it("dedupes artists appearing on multiple albums", () => {
    const out = parseSavedAlbumArtists(savedAlbums);
    const aCount = out.filter((a) => a.spotifyArtistId === "artist_a").length;
    expect(aCount).toBe(1);
  });

  it("uses album.images as fallback imageUrl (artist objects on /me/albums don't carry images)", () => {
    const out = parseSavedAlbumArtists(savedAlbums);
    const radiohead = out.find((a) => a.spotifyArtistId === "4Z8W4fKeB5YxbusRsdQVPb");
    expect(radiohead?.imageUrl).toBe("https://i.scdn.co/image/inrainbows.jpg");
  });

  it("genres is empty string (saved-album fallback can't know genres)", () => {
    const out = parseSavedAlbumArtists(savedAlbums);
    expect(out.every((a) => a.genres === "")).toBe(true);
  });

  it("returns [] on malformed payload", () => {
    expect(parseSavedAlbumArtists({})).toEqual([]);
  });
});
