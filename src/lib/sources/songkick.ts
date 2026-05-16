import type { ConcertStatus } from "@prisma/client";
import { countryToTimezone } from "@/lib/geo";
import type { ConcertHit, SourceAdapter } from "./types";

const BASE = "https://api.songkick.com/api/3.0";

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  norway: "NO",
  sweden: "SE",
  denmark: "DK",
};

type SKEvent = {
  id?: number | string;
  uri?: string;
  start?: { datetime?: string; date?: string };
  status?: string;
  performance?: { artist?: { displayName?: string } }[];
  venue?: {
    displayName?: string;
    lat?: number;
    lng?: number;
    city?: {
      displayName?: string;
      country?: { displayName?: string };
    };
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

export function parseSongkickResponse(json: unknown): ConcertHit[] {
  const events = (json as { resultsPage?: { results?: { event?: SKEvent[] } } })
    ?.resultsPage?.results?.event;
  if (!Array.isArray(events)) return [];

  const hits: ConcertHit[] = [];
  for (const ev of events) {
    if (ev?.id == null) continue;
    const countryName = ev.venue?.city?.country?.displayName?.toLowerCase().trim();
    const cc = countryName ? COUNTRY_NAME_TO_CODE[countryName] : undefined;
    if (!cc) continue;

    const dt = ev.start?.datetime ?? ev.start?.date;
    if (!dt) continue;
    const eventDate = new Date(dt);
    if (Number.isNaN(eventDate.getTime())) continue;

    hits.push({
      externalId: String(ev.id),
      source: "SONGKICK",
      artistName: ev.performance?.[0]?.artist?.displayName ?? "",
      venueName: ev.venue?.displayName ?? "",
      venueCity: ev.venue?.city?.displayName ?? "",
      venueCountry: cc,
      venueTimezone: countryToTimezone(cc),
      latitude: typeof ev.venue?.lat === "number" ? ev.venue.lat : undefined,
      longitude: typeof ev.venue?.lng === "number" ? ev.venue.lng : undefined,
      eventDate,
      ticketUrl: ev.uri,
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
  const key = process.env.SONGKICK_API_KEY;
  if (!key) return [];

  // Songkick requires a numeric artist id; the simplest path is the artist-search
  // endpoint, then calendar. For the MVP scaffold we issue both calls; live
  // integration is exercised only when ENABLE_SONGKICK=true.
  const search = await fetch(
    `${BASE}/search/artists.json?apikey=${encodeURIComponent(key)}` +
      `&query=${encodeURIComponent(artistName)}`,
  );
  if (!search.ok) throw new Error(`Songkick search ${search.status}`);
  const searchJson = (await search.json()) as {
    resultsPage?: { results?: { artist?: { id?: number }[] } };
  };
  const artistId = searchJson.resultsPage?.results?.artist?.[0]?.id;
  if (!artistId) return [];

  const cal = await fetch(
    `${BASE}/artists/${artistId}/calendar.json?apikey=${encodeURIComponent(key)}`,
  );
  if (!cal.ok) throw new Error(`Songkick calendar ${cal.status}`);
  return parseSongkickResponse(await cal.json());
}

export const songkick: SourceAdapter = {
  source: "SONGKICK",
  fetchForArtist,
};
