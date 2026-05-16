import type { ConcertStatus } from "@prisma/client";
import { countryToTimezone } from "@/lib/geo";
import type { ConcertHit, SourceAdapter } from "./types";

const SUPPORTED = new Set(["NO", "SE", "DK"]);
const BASE = "https://app.ticketmaster.com/discovery/v2/events.json";

type TMEvent = {
  id?: string;
  name?: string;
  url?: string;
  dates?: {
    start?: { dateTime?: string; localDate?: string; localTime?: string };
    timezone?: string;
    status?: { code?: string };
  };
  _embedded?: {
    venues?: {
      name?: string;
      city?: { name?: string };
      country?: { countryCode?: string };
      location?: { latitude?: string; longitude?: string };
      timezone?: string;
    }[];
    attractions?: { name?: string }[];
  };
};

function mapStatus(code: string | undefined): ConcertStatus {
  switch ((code ?? "").toLowerCase()) {
    case "cancelled":
      return "CANCELLED";
    case "postponed":
    case "rescheduled":
      return "POSTPONED";
    default:
      return "UPCOMING";
  }
}

export function parseTicketmasterResponse(json: unknown): ConcertHit[] {
  const events = (json as { _embedded?: { events?: TMEvent[] } })?._embedded?.events;
  if (!Array.isArray(events)) return [];

  const hits: ConcertHit[] = [];
  for (const ev of events) {
    if (!ev?.id) continue;
    const venue = ev._embedded?.venues?.[0];
    const cc = venue?.country?.countryCode?.toUpperCase();
    if (!cc || !SUPPORTED.has(cc)) continue;

    const dateTime = ev.dates?.start?.dateTime;
    if (!dateTime) continue;
    const eventDate = new Date(dateTime);
    if (Number.isNaN(eventDate.getTime())) continue;

    const lat = parseFloat(venue?.location?.latitude ?? "");
    const lon = parseFloat(venue?.location?.longitude ?? "");
    const artist = ev._embedded?.attractions?.[0]?.name ?? ev.name ?? "";

    hits.push({
      externalId: ev.id,
      source: "TICKETMASTER",
      artistName: artist,
      venueName: venue?.name ?? "",
      venueCity: venue?.city?.name ?? "",
      venueCountry: cc,
      venueTimezone: venue?.timezone ?? ev.dates?.timezone ?? countryToTimezone(cc),
      latitude: Number.isFinite(lat) ? lat : undefined,
      longitude: Number.isFinite(lon) ? lon : undefined,
      eventDate,
      ticketUrl: ev.url,
      status: mapStatus(ev.dates?.status?.code),
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
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return [];
  const url =
    `${BASE}?apikey=${encodeURIComponent(key)}` +
    `&keyword=${encodeURIComponent(artistName)}` +
    `&countryCode=NO,SE,DK&size=50&sort=date,asc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ticketmaster ${res.status}`);
  return parseTicketmasterResponse(await res.json());
}

export const ticketmaster: SourceAdapter = {
  source: "TICKETMASTER",
  fetchForArtist,
};
