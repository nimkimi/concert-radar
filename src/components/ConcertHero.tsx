import Link from "next/link";
import type { Source } from "@prisma/client";
import { SourceBadge } from "./SourceBadge";
import { ShareButton } from "./ShareButton";

export type ConcertHeroProps = {
  href: string;
  imageUrl: string | null;
  artistName: string;
  venueName: string;
  city: string;
  longDate: string;
  time: string;
  timezone: string;
  distanceLabel: string | null;
  daysUntil: number;
  sources: Source[];
  reason?: string;
  ticketUrl?: string | null;
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'>
      <rect width='800' height='800' fill='#1a1a1a'/>
      <circle cx='400' cy='400' r='200' fill='#1db954' fill-opacity='0.15'/>
    </svg>`,
  ).toString("base64");

export function ConcertHero({
  href,
  imageUrl,
  artistName,
  venueName,
  city,
  longDate,
  time,
  timezone,
  distanceLabel,
  daysUntil,
  sources,
  reason,
  ticketUrl,
}: ConcertHeroProps) {
  const upNextLabel =
    daysUntil <= 0
      ? "Tonight"
      : daysUntil === 1
        ? "Tomorrow"
        : `In ${daysUntil} days`;
  return (
    <article className="cr-card grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8 overflow-hidden mb-12" style={{ boxShadow: "var(--shadow-md)" }}>
      <div
        className="aspect-square bg-cover bg-center bg-(--color-bg-subtle) relative"
        style={{ backgroundImage: `url(${imageUrl ?? FALLBACK_IMAGE})` }}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, transparent 60%, rgba(0,0,0,0.15))" }} />
      </div>
      <div className="p-8 md:p-11 flex flex-col justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-(--color-green) mb-3.5">
            <span>↑</span> Up next · {upNextLabel}
          </span>
          <h2
            className="font-bold tracking-[-0.04em] leading-none mb-5"
            style={{ fontSize: "clamp(32px, 4vw, 52px)" }}
          >
            {artistName}
          </h2>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-baseline mb-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-(--color-text-dim)">Venue</span>
            <span className="font-medium">{venueName}, {city}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-(--color-text-dim)">Date</span>
            <span className="font-medium">{longDate} · {time} ({timezone})</span>
            {distanceLabel && (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-(--color-text-dim)">Distance</span>
                <span className="font-medium">{distanceLabel}</span>
              </>
            )}
            {reason && (
              <>
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-(--color-text-dim)">Why</span>
                <span className="font-medium">{reason}</span>
              </>
            )}
          </div>
          <div className="flex gap-1.5 mb-6">
            {sources.map((s) => (
              <SourceBadge key={s} source={s} size="full" />
            ))}
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          {ticketUrl && (
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cr-btn cr-btn--primary cr-btn--lg"
            >
              Get tickets
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M7 7h10v10" /></svg>
            </a>
          )}
          <Link href={href} className={ticketUrl ? "cr-btn cr-btn--secondary cr-btn--lg" : "cr-btn cr-btn--primary cr-btn--lg"}>
            View detail
          </Link>
          <ShareButton
            title={`${artistName} — ${venueName}`}
            text={`${artistName} at ${venueName}, ${city} · ${longDate}`}
            className="cr-btn cr-btn--ghost cr-btn--lg"
          />
        </div>
      </div>
    </article>
  );
}
