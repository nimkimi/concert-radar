import Link from "next/link";
import type { Source } from "@prisma/client";
import { SourceBadge } from "./SourceBadge";

export type ConcertCardProps = {
  href?: string;
  imageUrl: string | null;
  artistName: string;
  venueName: string;
  city: string;
  time: string;
  distanceLabel: string | null;
  sources: Source[];
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#1db954'/>
          <stop offset='100%' stop-color='#5b3ff5'/>
        </linearGradient>
      </defs>
      <rect width='800' height='1000' fill='url(#g)'/>
    </svg>`,
  ).toString("base64");

export function ConcertCard({
  href,
  imageUrl,
  artistName,
  venueName,
  city,
  time,
  distanceLabel,
  sources,
}: ConcertCardProps) {
  const card = (
    <article className="cr-concert-card">
      <img
        className="cr-concert-card__img"
        src={imageUrl ?? FALLBACK_IMAGE}
        alt=""
        loading="lazy"
      />
      <div className="cr-concert-card__overlay" />
      {distanceLabel && <div className="cr-concert-card__distance">{distanceLabel}</div>}
      <div className="cr-concert-card__sources">
        {sources.map((s) => (
          <SourceBadge key={s} source={s} />
        ))}
      </div>
      {sources.length > 1 && (
        <div
          className="absolute z-[2] left-4 text-[11px] font-semibold uppercase tracking-[0.1em]"
          style={{
            bottom: 100,
            color: "var(--color-cyan)",
            background: "rgba(0, 229, 255, 0.12)",
            border: "1px solid rgba(0, 229, 255, 0.3)",
            borderRadius: "var(--radius-pill)",
            padding: "4px 10px",
          }}
        >
          {sources.length} sources
        </div>
      )}
      <div className="cr-concert-card__body">
        <div className="cr-concert-card__artist">{artistName}</div>
        <div className="cr-concert-card__venue">
          {venueName}
          {city && venueName ? " · " : ""}
          {city}
        </div>
        <div className="cr-concert-card__time">{time}</div>
      </div>
    </article>
  );

  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}
