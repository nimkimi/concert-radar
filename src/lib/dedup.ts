import type { Concert, Source } from "@prisma/client";
import { normalizeArtistName } from "./normalize";
import { pickPrioritySource } from "./sources/priority";

export type DashboardConcert = {
  key: string;
  representative: Concert;
  sources: Source[];
  ticketUrl: string | null;
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function groupForDashboard(concerts: Concert[]): DashboardConcert[] {
  const map = new Map<string, Concert[]>();
  for (const c of concerts) {
    const key = `${normalizeArtistName(c.artistName)}|${c.venueCity.toLowerCase()}|${dayKey(c.eventDate)}`;
    const list = map.get(key);
    if (list) list.push(c);
    else map.set(key, [c]);
  }

  const groups: DashboardConcert[] = [];
  for (const [key, rows] of map) {
    // De-duplicate sources: one source can emit multiple rows for the same
    // artist+city+day (e.g. Ticketmaster presale + general onsale, or two
    // events of a tour). The badge bar wants one badge per source, not per
    // row.
    const sources = [...new Set(rows.map((r) => r.source))];
    const winnerSource = pickPrioritySource(sources);
    const rep = rows.find((r) => r.source === winnerSource) ?? rows[0];
    groups.push({ key, representative: rep, sources, ticketUrl: rep.ticketUrl });
  }
  groups.sort((a, b) => a.representative.eventDate.getTime() - b.representative.eventDate.getTime());
  return groups;
}
