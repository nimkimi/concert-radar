import Link from "next/link";
import type { Source } from "@prisma/client";

export type ConcertCardProps = {
  href?: string;
  imageUrl: string | null;
  artistName: string;
  venueName: string;
  city: string;
  /** Short pre-formatted date like "FRI · MAY 29" */
  datePill?: string;
  /** "20:30", appended after city */
  time?: string;
  distanceLabel: string | null;
  sources: Source[];
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#1db954' stop-opacity='0.4'/>
          <stop offset='100%' stop-color='#19a448' stop-opacity='0.2'/>
        </linearGradient>
      </defs>
      <rect width='800' height='500' fill='#1a1a1a'/>
      <rect width='800' height='500' fill='url(#g)'/>
    </svg>`,
  ).toString("base64");

// Compact, photo-led card used in the dashboard 3-up grid.
export function ConcertCard({
  href,
  imageUrl,
  artistName,
  venueName,
  city,
  datePill,
  time,
  distanceLabel,
  sources,
}: ConcertCardProps) {
  const venueLine =
    [venueName, city].filter(Boolean).join(", ") + (time ? ` · ${time}` : "");
  const card = (
    <article className="cr-card cr-card--lift overflow-hidden flex flex-col h-full group">
      <div
        className="relative aspect-[16/10] bg-(--color-bg-subtle) bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
        style={{ backgroundImage: `url(${imageUrl ?? FALLBACK_IMAGE})` }}
      >
        {sources.length > 1 && (
          <div className="absolute top-2.5 right-2.5 flex gap-1">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white tracking-[0.03em]"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            >
              {sources.length} sources
            </span>
          </div>
        )}
        {datePill && (
          <div
            className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-[0.04em] text-white"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          >
            {datePill}
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[17px] font-semibold tracking-[-0.02em] truncate">
          {artistName}
        </div>
        <div className="text-[13px] text-(--color-text-soft) mt-1 truncate">
          {venueLine}
        </div>
        <div className="flex justify-between items-center mt-3.5 pt-3.5 border-t border-(--color-border)">
          <span className="text-xs text-(--color-text-dim) font-medium">
            {distanceLabel ?? ""}
          </span>
          <span className="flex gap-1">
            {sources.map((s) => (
              <span
                key={s}
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    s === "TICKETMASTER" ? "var(--color-green)" : "var(--color-text-dim)",
                }}
              />
            ))}
          </span>
          <span className="text-(--color-text-dim) text-sm transition-all group-hover:text-(--color-green) group-hover:translate-x-1">
            →
          </span>
        </div>
      </div>
    </article>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}
