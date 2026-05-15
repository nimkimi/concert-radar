export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(x));
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

const COUNTRY_TIMEZONE: Record<string, string> = {
  NO: "Europe/Oslo",
  SE: "Europe/Stockholm",
  DK: "Europe/Copenhagen",
};

export function countryToTimezone(country: string): string {
  return COUNTRY_TIMEZONE[country.toUpperCase()] ?? "Europe/Oslo";
}
