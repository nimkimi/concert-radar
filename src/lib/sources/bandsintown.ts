import { countryToTimezone } from "@/lib/geo";
import type { ConcertHit, SourceAdapter } from "./types";

const BASE = "https://rest.bandsintown.com";

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  norway: "NO",
  sweden: "SE",
  denmark: "DK",
};

type BITEvent = {
  id?: string;
  url?: string;
  datetime?: string;
  venue?: {
    name?: string;
    city?: string;
    country?: string;
    latitude?: string;
    longitude?: string;
  };
  offers?: { url?: string; type?: string }[];
};

function tzOffsetMinutes(instant: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second"),
  );
  return (asUtc - instant.getTime()) / 60000;
}

function localDateTimeInTzToUtc(localStr: string, tz: string): Date {
  const naive = new Date(localStr + "Z");
  if (Number.isNaN(naive.getTime())) return naive;
  const offset = tzOffsetMinutes(naive, tz);
  return new Date(naive.getTime() - offset * 60000);
}

export function parseBandsintownResponse(json: unknown, artistName: string): ConcertHit[] {
  if (!Array.isArray(json)) return [];

  const hits: ConcertHit[] = [];
  for (const ev of json as BITEvent[]) {
    if (!ev?.id || !ev.datetime) continue;
    const countryName = ev.venue?.country?.toLowerCase().trim();
    const cc = countryName ? COUNTRY_NAME_TO_CODE[countryName] : undefined;
    if (!cc) continue;

    const tz = countryToTimezone(cc);
    const eventDate = localDateTimeInTzToUtc(ev.datetime, tz);
    if (Number.isNaN(eventDate.getTime())) continue;

    const lat = parseFloat(ev.venue?.latitude ?? "");
    const lon = parseFloat(ev.venue?.longitude ?? "");
    const offerUrl = ev.offers?.find((o) => o.type === "Tickets")?.url ?? ev.offers?.[0]?.url;

    hits.push({
      externalId: ev.id,
      source: "BANDSINTOWN",
      artistName,
      venueName: ev.venue?.name ?? "",
      venueCity: ev.venue?.city ?? "",
      venueCountry: cc,
      venueTimezone: tz,
      latitude: Number.isFinite(lat) ? lat : undefined,
      longitude: Number.isFinite(lon) ? lon : undefined,
      eventDate,
      ticketUrl: offerUrl ?? ev.url,
      status: "UPCOMING",
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
  const appId = process.env.BANDSINTOWN_APP_ID;
  if (!appId) return [];
  const url =
    `${BASE}/artists/${encodeURIComponent(artistName)}/events?` +
    `app_id=${encodeURIComponent(appId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    // Bandsintown 404s for unknown artists — treat as no hits.
    if (res.status === 404) return [];
    throw new Error(`Bandsintown ${res.status}`);
  }
  return parseBandsintownResponse(await res.json(), artistName);
}

export const bandsintown: SourceAdapter = {
  source: "BANDSINTOWN",
  fetchForArtist,
};
