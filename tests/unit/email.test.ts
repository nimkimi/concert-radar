import { describe, it, expect } from "vitest";
import type { Concert, User } from "@prisma/client";
import { buildDigestEmail, buildInstantEmail } from "@/lib/email";

const USER: User = {
  id: "u1",
  spotifyId: "s1",
  email: "kristoffer@example.com",
  emailVerified: null,
  name: "Kristoffer",
  image: null,
  cityName: "Bergen",
  latitude: 60.39,
  longitude: 5.32,
  radiusKm: 100,
  notificationsEnabled: true,
  notificationFrequency: "DAILY_DIGEST",
  lastArtistSyncAt: null,
  lastConcertSyncAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

function mkConcert(p: Partial<Concert> & Pick<Concert, "id" | "artistName" | "eventDate">): Concert {
  return {
    externalId: p.externalId ?? `ext-${p.id}`,
    source: p.source ?? "TICKETMASTER",
    artistName: p.artistName,
    venueName: p.venueName ?? "Sentrum Scene",
    venueCity: p.venueCity ?? "Oslo",
    venueCountry: p.venueCountry ?? "NO",
    venueTimezone: p.venueTimezone ?? "Europe/Oslo",
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    eventDate: p.eventDate,
    ticketUrl: p.ticketUrl ?? "https://example.com/t",
    status: p.status ?? "UPCOMING",
    createdAt: p.createdAt ?? new Date(),
    id: p.id,
  } as Concert;
}

describe("buildInstantEmail", () => {
  const concert = mkConcert({
    id: "c1",
    artistName: "Radiohead",
    eventDate: new Date("2026-06-15T18:00:00Z"),
    venueName: "Sentrum Scene",
    venueCity: "Oslo",
    venueTimezone: "Europe/Oslo",
    ticketUrl: "https://ticketmaster.no/radiohead",
  });

  it("subject names the artist", () => {
    const e = buildInstantEmail(USER, concert);
    expect(e.subject).toContain("Radiohead");
  });

  it("HTML includes artist, venue, city, and the ticket link", () => {
    const html = buildInstantEmail(USER, concert).html;
    expect(html).toContain("Radiohead");
    expect(html).toContain("Sentrum Scene");
    expect(html).toContain("Oslo");
    expect(html).toContain("https://ticketmaster.no/radiohead");
  });

  it("renders event time in the venue timezone, not in UTC", () => {
    // 2026-06-15T18:00:00Z → 20:00 in Europe/Oslo (CEST, UTC+2)
    const html = buildInstantEmail(USER, concert).html;
    expect(html).toMatch(/20[:.]00/);
  });

  it("plain-text fallback exists and mirrors the URL", () => {
    const e = buildInstantEmail(USER, concert);
    expect(e.text).toBeTypeOf("string");
    expect(e.text).toContain("https://ticketmaster.no/radiohead");
  });

  it("escapes HTML in user-controlled fields", () => {
    const evil = mkConcert({
      id: "c2",
      artistName: "<script>alert(1)</script>",
      eventDate: new Date("2026-06-15T18:00:00Z"),
    });
    const html = buildInstantEmail(USER, evil).html;
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("buildDigestEmail", () => {
  const concerts: Concert[] = [
    mkConcert({
      id: "a",
      artistName: "Radiohead",
      venueName: "Sentrum Scene",
      venueCity: "Oslo",
      venueTimezone: "Europe/Oslo",
      eventDate: new Date("2026-06-15T18:00:00Z"),
      ticketUrl: "https://tm.no/r",
    }),
    mkConcert({
      id: "b",
      artistName: "Sigur Rós",
      venueName: "Grieghallen",
      venueCity: "Bergen",
      venueTimezone: "Europe/Oslo",
      eventDate: new Date("2026-07-04T20:00:00Z"),
      ticketUrl: "https://tm.no/s",
    }),
  ];

  it("subject counts concerts", () => {
    const e = buildDigestEmail(USER, concerts);
    expect(e.subject).toMatch(/2/);
  });

  it("HTML contains every concert's artist + venue + ticket link", () => {
    const html = buildDigestEmail(USER, concerts).html;
    for (const c of concerts) {
      expect(html).toContain(c.artistName);
      expect(html).toContain(c.venueName);
      expect(html).toContain(c.ticketUrl!);
    }
  });

  it("times shown in each concert's own venue timezone", () => {
    const html = buildDigestEmail(USER, concerts).html;
    // 2026-06-15T18:00:00Z → 20:00 Oslo
    // 2026-07-04T20:00:00Z → 22:00 Oslo
    expect(html).toMatch(/20[:.]00/);
    expect(html).toMatch(/22[:.]00/);
  });

  it("greets the user by name when available", () => {
    const html = buildDigestEmail(USER, concerts).html;
    expect(html).toContain("Kristoffer");
  });

  it("plain-text fallback lists every concert URL", () => {
    const text = buildDigestEmail(USER, concerts).text;
    for (const c of concerts) {
      expect(text).toContain(c.ticketUrl!);
    }
  });

  it("escapes HTML in artist and venue names", () => {
    const evil = [
      mkConcert({
        id: "x",
        artistName: "<img src=x onerror=alert(1)>",
        venueName: "<b>fake</b>",
        eventDate: new Date("2026-06-15T18:00:00Z"),
      }),
    ];
    const html = buildDigestEmail(USER, evil).html;
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>fake</b>");
    expect(html).toContain("&lt;");
  });
});
