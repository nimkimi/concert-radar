export type Place = {
  name: string;
  lat: number;
  lon: number;
  country: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    municipality?: string;
    country_code?: string;
  };
};

const SUPPORTED = new Set(["NO", "SE", "DK"]);

export function parseNominatimResults(json: unknown): Place[] {
  if (!Array.isArray(json)) return [];
  const out: Place[] = [];
  for (const raw of json as NominatimResult[]) {
    const cc = raw.address?.country_code?.toUpperCase();
    if (!cc || !SUPPORTED.has(cc)) continue;
    const lat = parseFloat(raw.lat ?? "");
    const lon = parseFloat(raw.lon ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const name =
      raw.address?.city ??
      raw.address?.town ??
      raw.address?.village ??
      raw.address?.suburb ??
      raw.display_name?.split(",")[0]?.trim();
    if (!name) continue;
    out.push({ name, lat, lon, country: cc });
  }
  return out;
}

export async function searchCity(q: string): Promise<Place[]> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=json&addressdetails=1&countrycodes=no,se,dk&limit=8` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Concert Radar (https://github.com/nimkimi/concert-radar)",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) return [];
  return parseNominatimResults(await res.json());
}
