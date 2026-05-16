import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSongkickResponse } from "@/lib/sources/songkick";

const radiohead = JSON.parse(
  readFileSync(join(__dirname, "../../__fixtures__/songkick/radiohead.json"), "utf8"),
);

describe("parseSongkickResponse", () => {
  it("filters to NO/SE/DK only (drops Germany)", () => {
    const hits = parseSongkickResponse(radiohead);
    expect(hits.map((h) => h.externalId).sort()).toEqual(["11111", "22222"]);
  });

  it("sets source = SONGKICK and country code", () => {
    const hits = parseSongkickResponse(radiohead);
    expect(hits.every((h) => h.source === "SONGKICK")).toBe(true);
    expect(hits.find((h) => h.externalId === "11111")?.venueCountry).toBe("NO");
    expect(hits.find((h) => h.externalId === "22222")?.venueCountry).toBe("SE");
  });

  it("maps performance[0].artist.displayName as artistName", () => {
    const oslo = parseSongkickResponse(radiohead).find((h) => h.externalId === "11111")!;
    expect(oslo.artistName).toBe("Radiohead");
  });

  it("parses start.datetime (with timezone offset) into UTC", () => {
    const oslo = parseSongkickResponse(radiohead).find((h) => h.externalId === "11111")!;
    // 2026-06-15T20:00:00+0200 → 18:00:00Z
    expect(oslo.eventDate.toISOString()).toBe("2026-06-15T18:00:00.000Z");
  });

  it("derives venue timezone from country", () => {
    const hits = parseSongkickResponse(radiohead);
    expect(hits.find((h) => h.externalId === "11111")?.venueTimezone).toBe("Europe/Oslo");
    expect(hits.find((h) => h.externalId === "22222")?.venueTimezone).toBe("Europe/Stockholm");
  });

  it("maps venue + city + lat/lon", () => {
    const oslo = parseSongkickResponse(radiohead).find((h) => h.externalId === "11111")!;
    expect(oslo.venueName).toBe("Sentrum Scene");
    expect(oslo.venueCity).toBe("Oslo");
    expect(oslo.latitude).toBeCloseTo(59.9139, 3);
    expect(oslo.longitude).toBeCloseTo(10.7522, 3);
  });

  it("status: ok → UPCOMING, cancelled → CANCELLED", () => {
    const hits = parseSongkickResponse(radiohead);
    expect(hits.find((h) => h.externalId === "11111")?.status).toBe("UPCOMING");
    expect(hits.find((h) => h.externalId === "22222")?.status).toBe("CANCELLED");
  });

  it("ticketUrl comes from event.uri", () => {
    const oslo = parseSongkickResponse(radiohead).find((h) => h.externalId === "11111")!;
    expect(oslo.ticketUrl).toBe("https://www.songkick.com/concerts/11111");
  });

  it("returns [] on malformed input", () => {
    expect(parseSongkickResponse(null)).toEqual([]);
    expect(parseSongkickResponse({})).toEqual([]);
    expect(parseSongkickResponse({ resultsPage: { results: {} } })).toEqual([]);
  });
});
