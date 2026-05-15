import type { Source } from "@prisma/client";

const VARIANT: Record<Source, string> = {
  TICKETMASTER: "cr-source-badge--ticketmaster",
  BANDSINTOWN: "cr-source-badge--bandsintown",
  SONGKICK: "cr-source-badge--songkick",
  BILLETTO: "cr-source-badge--billetto",
};

const SHORT: Record<Source, string> = {
  TICKETMASTER: "TM",
  BANDSINTOWN: "BIT",
  SONGKICK: "SK",
  BILLETTO: "BLT",
};

const FULL: Record<Source, string> = {
  TICKETMASTER: "Ticketmaster",
  BANDSINTOWN: "Bandsintown",
  SONGKICK: "Songkick",
  BILLETTO: "Billetto",
};

export type SourceBadgeProps = {
  source: Source;
  size?: "short" | "full";
};

export function SourceBadge({ source, size = "short" }: SourceBadgeProps) {
  return (
    <span className={`cr-source-badge ${VARIANT[source]}`}>
      {size === "short" ? SHORT[source] : FULL[source]}
    </span>
  );
}
