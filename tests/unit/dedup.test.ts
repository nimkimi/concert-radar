import { describe, it, expect } from "vitest";
import type { Concert } from "@prisma/client";
import { groupForDashboard } from "@/lib/dedup";

function concert(p: Partial<Concert> & Pick<Concert, "id" | "source" | "artistName" | "venueCity" | "eventDate">): Concert {
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
    ticketUrl: p.ticketUrl ?? `https://example.com/${p.id}`,
    status: p.status ?? "UPCOMING",
    createdAt: p.createdAt ?? new Date(),
    id: p.id,
    source: p.source,
  } as Concert;
}

describe("groupForDashboard", () => {
  it("groups concerts with same normalized artist + city + day", () => {
    const day = new Date("2026-06-15T18:00:00Z");
    const out = groupForDashboard([
      concert({ id: "a", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Oslo", eventDate: day }),
      concert({ id: "b", source: "BANDSINTOWN", artistName: "Radiohead", venueCity: "Oslo", eventDate: day }),
      concert({ id: "c", source: "TICKETMASTER", artistName: "Sigur Ros", venueCity: "Bergen", eventDate: day }),
    ]);
    expect(out).toHaveLength(2);
    const radiohead = out.find((g) => g.representative.artistName === "Radiohead")!;
    expect(radiohead.sources.sort()).toEqual(["BANDSINTOWN", "TICKETMASTER"]);
  });

  it("picks Ticketmaster as the representative when both Ticketmaster and Bandsintown match", () => {
    const day = new Date("2026-06-15T18:00:00Z");
    const out = groupForDashboard([
      concert({ id: "bandsintown-row", source: "BANDSINTOWN", artistName: "Radiohead", venueCity: "Oslo", eventDate: day, ticketUrl: "https://bandsintown/x" }),
      concert({ id: "tm-row", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Oslo", eventDate: day, ticketUrl: "https://ticketmaster/x" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].representative.source).toBe("TICKETMASTER");
    expect(out[0].ticketUrl).toBe("https://ticketmaster/x");
  });

  it("normalizes artist names: 'The 1975' and '1975' are the same group", () => {
    const day = new Date("2026-06-15T18:00:00Z");
    const out = groupForDashboard([
      concert({ id: "a", source: "TICKETMASTER", artistName: "The 1975", venueCity: "Oslo", eventDate: day }),
      concert({ id: "b", source: "BANDSINTOWN", artistName: "1975", venueCity: "Oslo", eventDate: day }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].sources).toHaveLength(2);
  });

  it("does not group across different cities", () => {
    const day = new Date("2026-06-15T18:00:00Z");
    const out = groupForDashboard([
      concert({ id: "a", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Oslo", eventDate: day }),
      concert({ id: "b", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Bergen", eventDate: day }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("does not group across different days (same instant in two TZs is still 2 days apart counts as different)", () => {
    const out = groupForDashboard([
      concert({ id: "a", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Oslo", eventDate: new Date("2026-06-15T18:00:00Z") }),
      concert({ id: "b", source: "TICKETMASTER", artistName: "Radiohead", venueCity: "Oslo", eventDate: new Date("2026-06-16T18:00:00Z") }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("sorts groups by eventDate ascending", () => {
    const out = groupForDashboard([
      concert({ id: "later", source: "TICKETMASTER", artistName: "B", venueCity: "Oslo", eventDate: new Date("2026-07-01T18:00:00Z") }),
      concert({ id: "earlier", source: "TICKETMASTER", artistName: "A", venueCity: "Oslo", eventDate: new Date("2026-06-15T18:00:00Z") }),
    ]);
    expect(out.map((g) => g.representative.id)).toEqual(["earlier", "later"]);
  });

  it("returns [] for empty input", () => {
    expect(groupForDashboard([])).toEqual([]);
  });
});
