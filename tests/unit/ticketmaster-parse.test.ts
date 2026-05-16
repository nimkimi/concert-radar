import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTicketmasterResponse } from "@/lib/sources/ticketmaster";

const fix = (p: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../__fixtures__/ticketmaster", p), "utf8"));

const radiohead = fix("radiohead-oslo.json");
const empty = fix("empty.json");

describe("parseTicketmasterResponse", () => {
  it("filters to NO/SE/DK only", () => {
    const hits = parseTicketmasterResponse(radiohead);
    expect(hits.map((h) => h.externalId).sort()).toEqual(["tm-1", "tm-2", "tm-4"]);
  });

  it("sets source = TICKETMASTER", () => {
    const hits = parseTicketmasterResponse(radiohead);
    expect(hits.every((h) => h.source === "TICKETMASTER")).toBe(true);
  });

  it("maps venue + city + country + lat/lon", () => {
    const oslo = parseTicketmasterResponse(radiohead).find((h) => h.externalId === "tm-1")!;
    expect(oslo.venueName).toBe("Sentrum Scene");
    expect(oslo.venueCity).toBe("Oslo");
    expect(oslo.venueCountry).toBe("NO");
    expect(oslo.latitude).toBeCloseTo(59.9139, 3);
    expect(oslo.longitude).toBeCloseTo(10.7522, 3);
  });

  it("uses venue.timezone when provided, falls back to country-based TZ", () => {
    const hits = parseTicketmasterResponse(radiohead);
    expect(hits.find((h) => h.externalId === "tm-1")?.venueTimezone).toBe("Europe/Oslo");
    // tm-2 venue has no timezone — falls back to country SE → Europe/Stockholm
    expect(hits.find((h) => h.externalId === "tm-2")?.venueTimezone).toBe("Europe/Stockholm");
  });

  it("eventDate is a Date parsed from dates.start.dateTime (UTC)", () => {
    const oslo = parseTicketmasterResponse(radiohead).find((h) => h.externalId === "tm-1")!;
    expect(oslo.eventDate).toBeInstanceOf(Date);
    expect(oslo.eventDate.toISOString()).toBe("2026-06-15T18:00:00.000Z");
  });

  it("maps artist name from first attraction", () => {
    const oslo = parseTicketmasterResponse(radiohead).find((h) => h.externalId === "tm-1")!;
    expect(oslo.artistName).toBe("Radiohead");
  });

  it("maps ticketUrl from event.url", () => {
    const oslo = parseTicketmasterResponse(radiohead).find((h) => h.externalId === "tm-1")!;
    expect(oslo.ticketUrl).toBe("https://www.ticketmaster.no/event/radiohead-oslo");
  });

  it("maps status: onsale → UPCOMING, cancelled → CANCELLED, rescheduled → POSTPONED", () => {
    const hits = parseTicketmasterResponse(radiohead);
    expect(hits.find((h) => h.externalId === "tm-1")?.status).toBe("UPCOMING");
    expect(hits.find((h) => h.externalId === "tm-2")?.status).toBe("POSTPONED");
    expect(hits.find((h) => h.externalId === "tm-4")?.status).toBe("CANCELLED");
  });

  it("returns [] on empty response", () => {
    expect(parseTicketmasterResponse(empty)).toEqual([]);
  });

  it("returns [] on malformed input", () => {
    expect(parseTicketmasterResponse({})).toEqual([]);
    expect(parseTicketmasterResponse(null)).toEqual([]);
  });
});
