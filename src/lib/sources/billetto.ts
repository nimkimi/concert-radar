import type { ConcertStatus } from "@prisma/client";
import { countryToTimezone } from "@/lib/geo";
import type { ConcertHit, SourceAdapter } from "./types";

const SUPPORTED = new Set(["NO", "SE", "DK"]);
const BASE = "https://api.billetto.com/v1";

type BLEvent = {
  id?: string;
  url?: string;
  start_at?: string;
  status?: string;
  venue?: {
    name?: string;
    city?: string;
    country_code?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
};

function mapStatus(status: string | undefined): ConcertStatus {
  switch ((status ?? "").toLowerCase()) {
    case "cancelled":
      return "CANCELLED";
    case "postponed":
    case "rescheduled":
      return "POSTPONED";
    default:
      return "UPCOMING";
  }
}

export function parseBillettoResponse(json: unknown, artistName: string): ConcertHit[] {
  const items = (json as { data?: BLEvent[] })?.data;
  if (!Array.isArray(items)) return [];

  const hits: ConcertHit[] = [];
  for (const ev of items) {
    if (!ev?.id) continue;
    const cc = ev.venue?.country_code?.toUpperCase();
    if (!cc || !SUPPORTED.has(cc)) continue;
    if (!ev.start_at) continue;
    const eventDate = new Date(ev.start_at);
    if (Number.isNaN(eventDate.getTime())) continue;

    hits.push({
      externalId: ev.id,
      source: "BILLETTO",
      artistName,
      venueName: ev.venue?.name ?? "",
      venueCity: ev.venue?.city ?? "",
      venueCountry: cc,
      venueTimezone: ev.venue?.timezone ?? countryToTimezone(cc),
      latitude: typeof ev.venue?.latitude === "number" ? ev.venue.latitude : undefined,
      longitude: typeof ev.venue?.longitude === "number" ? ev.venue.longitude : undefined,
      eventDate,
      ticketUrl: ev.url,
      status: mapStatus(ev.status),
    });
  }
  return hits;
}

async function fetchForArtist({
  artistName,
}: {
  artistName: string;
  spotifyArtistId: string;
}): Promise<ConcertHit[]> {
  const key = process.env.BILLETTO_API_KEY;
  if (!key) return [];
  const url =
    `${BASE}/events?q=${encodeURIComponent(artistName)}` +
    `&country_code=NO,SE,DK`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Billetto ${res.status}`);
  }
  return parseBillettoResponse(await res.json(), artistName);
}

export const billetto: SourceAdapter = {
  source: "BILLETTO",
  fetchForArtist,
};
