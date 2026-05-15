import type { Source } from "@prisma/client";

const ORDER: Source[] = ["TICKETMASTER", "BILLETTO", "BANDSINTOWN", "SONGKICK"];

export function pickPrioritySource(present: Source[]): Source {
  return ORDER.find((s) => present.includes(s)) ?? present[0];
}
