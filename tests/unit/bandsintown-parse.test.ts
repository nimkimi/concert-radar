import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBandsintownResponse } from "@/lib/sources/bandsintown";

const fix = (p: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../__fixtures__/bandsintown", p), "utf8"));

const sigur = fix("sigur-ros.json");

describe("parseBandsintownResponse", () => {
  it("filters to NO/SE/DK only (mapping country names → codes)", () => {
    const hits = parseBandsintownResponse(sigur, "Sigur Rós");
    expect(hits.map((h) => h.externalId).sort()).toEqual(["bit-101", "bit-103", "bit-104"]);
  });

  it("sets source = BANDSINTOWN and country code (NO/SE/DK)", () => {
    const hits = parseBandsintownResponse(sigur, "Sigur Rós");
    expect(hits.every((h) => h.source === "BANDSINTOWN")).toBe(true);
    expect(hits.find((h) => h.externalId === "bit-101")?.venueCountry).toBe("NO");
    expect(hits.find((h) => h.externalId === "bit-103")?.venueCountry).toBe("SE");
    expect(hits.find((h) => h.externalId === "bit-104")?.venueCountry).toBe("DK");
  });

  it("derives venue timezone from country", () => {
    const hits = parseBandsintownResponse(sigur, "Sigur Rós");
    expect(hits.find((h) => h.externalId === "bit-101")?.venueTimezone).toBe("Europe/Oslo");
    expect(hits.find((h) => h.externalId === "bit-103")?.venueTimezone).toBe("Europe/Stockholm");
    expect(hits.find((h) => h.externalId === "bit-104")?.venueTimezone).toBe("Europe/Copenhagen");
  });

  it("uses passed artistName (Bandsintown datetime is local — venue tz applies)", () => {
    const bergen = parseBandsintownResponse(sigur, "Sigur Rós").find(
      (h) => h.externalId === "bit-101",
    )!;
    expect(bergen.artistName).toBe("Sigur Rós");
  });

  it("interprets datetime as venue-local time and converts to UTC", () => {
    // 2026-08-12T20:00:00 in Europe/Oslo (CEST, UTC+2) → 18:00:00Z
    const bergen = parseBandsintownResponse(sigur, "Sigur Rós").find(
      (h) => h.externalId === "bit-101",
    )!;
    expect(bergen.eventDate.toISOString()).toBe("2026-08-12T18:00:00.000Z");
  });

  it("maps lat/lon as numbers when present, undefined when missing", () => {
    const hits = parseBandsintownResponse(sigur, "Sigur Rós");
    const bergen = hits.find((h) => h.externalId === "bit-101")!;
    expect(bergen.latitude).toBeCloseTo(60.3878, 3);
    expect(bergen.longitude).toBeCloseTo(5.3325, 3);
    const stockholm = hits.find((h) => h.externalId === "bit-103")!;
    expect(stockholm.latitude).toBeUndefined();
    expect(stockholm.longitude).toBeUndefined();
  });

  it("uses offers[0].url for ticketUrl when present, falls back to event.url", () => {
    const hits = parseBandsintownResponse(sigur, "Sigur Rós");
    expect(hits.find((h) => h.externalId === "bit-101")?.ticketUrl).toBe(
      "https://tickets.example.com/101",
    );
    expect(hits.find((h) => h.externalId === "bit-103")?.ticketUrl).toBe(
      "https://www.bandsintown.com/e/103",
    );
  });

  it("status defaults to UPCOMING", () => {
    const hits = parseBandsintownResponse(sigur, "Sigur Rós");
    expect(hits.every((h) => h.status === "UPCOMING")).toBe(true);
  });

  it("returns [] on malformed input", () => {
    expect(parseBandsintownResponse(null, "x")).toEqual([]);
    expect(parseBandsintownResponse({}, "x")).toEqual([]);
  });
});
