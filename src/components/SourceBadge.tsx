import type { Source } from "@prisma/client";

const FULL: Record<Source, string> = {
  TICKETMASTER: "Ticketmaster",
  BANDSINTOWN: "Bandsintown",
  SONGKICK: "Songkick",
  BILLETTO: "Billetto",
};

const SHORT: Record<Source, string> = {
  TICKETMASTER: "TM",
  BANDSINTOWN: "BIT",
  SONGKICK: "SK",
  BILLETTO: "BLT",
};

export type SourceBadgeProps = {
  source: Source;
  size?: "short" | "full";
};

// v2: Ticketmaster gets the green accent (it's our primary source).
// Other sources are neutral chips — colour is a signal of priority,
// not a brand celebration.
export function SourceBadge({ source, size = "full" }: SourceBadgeProps) {
  const label = size === "short" ? SHORT[source] : FULL[source];
  const variant = source === "TICKETMASTER" ? "cr-source cr-source--green" : "cr-source";
  return <span className={variant}>{label}</span>;
}
