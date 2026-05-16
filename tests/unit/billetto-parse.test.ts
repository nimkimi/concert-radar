import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBillettoResponse } from "@/lib/sources/billetto";

const local = JSON.parse(
  readFileSync(join(__dirname, "../../__fixtures__/billetto/local-artist.json"), "utf8"),
);

describe("parseBillettoResponse", () => {
  it("filters to NO/SE/DK only (drops DE)", () => {
    const hits = parseBillettoResponse(local, "Local Artist");
    expect(hits.map((h) => h.externalId).sort()).toEqual([
      "billetto-aaa",
      "billetto-bbb",
      "billetto-ccc",
    ]);
  });

  it("normalizes country_code to upper case", () => {
    const hits = parseBillettoResponse(local, "Local Artist");
    expect(hits.find((h) => h.externalId === "billetto-bbb")?.venueCountry).toBe("DK");
  });

  it("sets source = BILLETTO", () => {
    const hits = parseBillettoResponse(local, "Local Artist");
    expect(hits.every((h) => h.source === "BILLETTO")).toBe(true);
  });

  it("uses passed artistName (Billetto title is event-name, not artist)", () => {
    const hits = parseBillettoResponse(local, "Local Artist");
    expect(hits.every((h) => h.artistName === "Local Artist")).toBe(true);
  });

  it("parses start_at as UTC", () => {
    const oslo = parseBillettoResponse(local, "Local Artist").find(
      (h) => h.externalId === "billetto-aaa",
    )!;
    expect(oslo.eventDate.toISOString()).toBe("2026-06-15T18:00:00.000Z");
  });

  it("prefers venue.timezone, falls back to country tz", () => {
    const hits = parseBillettoResponse(local, "Local Artist");
    expect(hits.find((h) => h.externalId === "billetto-aaa")?.venueTimezone).toBe("Europe/Oslo");
    // billetto-ccc has no venue.timezone → fallback to SE
    expect(hits.find((h) => h.externalId === "billetto-ccc")?.venueTimezone).toBe(
      "Europe/Stockholm",
    );
  });

  it("status: active → UPCOMING, cancelled → CANCELLED", () => {
    const hits = parseBillettoResponse(local, "Local Artist");
    expect(hits.find((h) => h.externalId === "billetto-aaa")?.status).toBe("UPCOMING");
    expect(hits.find((h) => h.externalId === "billetto-bbb")?.status).toBe("CANCELLED");
  });

  it("maps lat/lon when present, undefined otherwise", () => {
    const hits = parseBillettoResponse(local, "Local Artist");
    expect(hits.find((h) => h.externalId === "billetto-aaa")?.latitude).toBeCloseTo(59.9139, 3);
    expect(hits.find((h) => h.externalId === "billetto-ccc")?.latitude).toBeUndefined();
  });

  it("returns [] on malformed input", () => {
    expect(parseBillettoResponse(null, "x")).toEqual([]);
    expect(parseBillettoResponse({}, "x")).toEqual([]);
  });
});
