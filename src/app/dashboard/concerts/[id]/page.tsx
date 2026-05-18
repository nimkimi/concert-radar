import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Source } from "@prisma/client";
import { AppNav } from "@/components/AppNav";
import { SourceBadge } from "@/components/SourceBadge";
import { ShareButton } from "@/components/ShareButton";
import { auth } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";
import { haversineKm } from "@/lib/geo";
import { normalizeArtistName } from "@/lib/normalize";
import { pickPrioritySource } from "@/lib/sources/priority";
import {
  daysUntil,
  formatDistanceKm,
  formatEventTime,
  formatLongEventDate,
  formatRelativeMinutes,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<Source, string> = {
  TICKETMASTER: "Ticketmaster",
  BANDSINTOWN: "Bandsintown",
  SONGKICK: "Songkick",
  BILLETTO: "Billetto",
};

const STATUS_LABEL = {
  UPCOMING: "Upcoming",
  CANCELLED: "Cancelled",
  POSTPONED: "Postponed",
} as const;

const FALLBACK_HERO =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1200'>
      <rect width='1000' height='1200' fill='#1a1a1a'/>
      <circle cx='500' cy='600' r='280' fill='#1db954' fill-opacity='0.12'/>
    </svg>`,
  ).toString("base64");

export default async function ConcertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const { id } = await params;

  const representative = await prisma.concert.findUnique({ where: { id } });
  if (!representative) notFound();

  const dayStart = new Date(representative.eventDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const sameDay = await prisma.concert.findMany({
    where: {
      eventDate: { gte: dayStart, lt: dayEnd },
      venueCity: representative.venueCity,
    },
  });
  const repNorm = normalizeArtistName(representative.artistName);
  const groupRows = sameDay.filter(
    (c) => normalizeArtistName(c.artistName) === repNorm,
  );
  const sources = [...new Set(groupRows.map((r) => r.source))];
  const winnerSource = pickPrioritySource(sources);
  const winnerRow =
    groupRows.find((r) => r.source === winnerSource) ?? representative;

  const [user, allTracked] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, latitude: true, longitude: true },
    }),
    prisma.trackedArtist.findMany({
      where: { userId: session.user.id },
      select: { name: true, imageUrl: true },
    }),
  ]);
  if (!user) redirect("/");

  const heroImage =
    allTracked.find((a) => normalizeArtistName(a.name) === repNorm)?.imageUrl ?? null;

  const distanceKm =
    user.latitude != null &&
    user.longitude != null &&
    representative.latitude != null &&
    representative.longitude != null
      ? haversineKm(
          { lat: user.latitude, lon: user.longitude },
          { lat: representative.latitude, lon: representative.longitude },
        )
      : null;

  const tz = representative.venueTimezone;
  const longDate = formatLongEventDate(representative.eventDate, tz);
  const time = formatEventTime(representative.eventDate, tz);
  const distLabel = formatDistanceKm(distanceKm);
  const dUntil = daysUntil(representative.eventDate);
  const status = representative.status;

  const inDays =
    dUntil <= 0 ? "Tonight" : dUntil === 1 ? "Tomorrow" : `In ${dUntil} days`;

  return (
    <>
      <AppNav activeHref="/dashboard" />

      <div className="cr-frame pt-6 flex gap-2 text-sm text-(--color-text-dim)">
        <Link href="/dashboard" className="hover:text-(--color-green) transition-colors">Dashboard</Link>
        <span className="text-(--color-border-strong)">/</span>
        <span>{representative.artistName}</span>
      </div>

      <main className="cr-frame pt-6 pb-24">
        <section className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 items-start mb-14">
          <div
            className="aspect-[4/5] rounded-2xl overflow-hidden bg-(--color-bg-subtle) relative"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <img
              src={heroImage ?? FALLBACK_HERO}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 flex gap-1.5">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{
                  backdropFilter: "blur(10px)",
                  background: "rgba(0,0,0,0.55)",
                }}
              >
                {inDays}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-(--color-green) mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-(--color-green)" />
              {status === "UPCOMING" ? "Up next from your radar" : STATUS_LABEL[status]}
            </span>
            <h1
              className="font-bold tracking-[-0.04em] leading-none mb-3"
              style={{ fontSize: "clamp(40px, 5vw, 64px)" }}
            >
              {representative.artistName}
            </h1>
            <p className="text-[17px] text-(--color-text-soft) mb-8 leading-[1.6]">
              {representative.venueName} · {representative.venueCity}
            </p>

            <div className="cr-card overflow-hidden mb-7">
              <DetailRow k="Date" v={`${longDate} · ${time}`} sub={tz} />
              <DetailRow k="Distance" v={distLabel ?? "—"} sub={distLabel ? undefined : "Set your city in settings to see distance"} />
              <DetailRow k="Venue" v={representative.venueName} sub={`${representative.venueCity}, ${representative.venueCountry}`} />
              <DetailRow k="Status" v={STATUS_LABEL[status]} last />
            </div>

            <div className="flex gap-1.5 mb-6">
              {sources.map((s) => (
                <SourceBadge key={s} source={s} size="full" />
              ))}
            </div>

            <div className="flex gap-2.5 flex-wrap mb-6">
              {winnerRow.ticketUrl ? (
                <a
                  href={winnerRow.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cr-btn cr-btn--primary cr-btn--lg"
                >
                  Get tickets on {SOURCE_LABEL[winnerSource]}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M7 17L17 7M7 7h10v10" /></svg>
                </a>
              ) : (
                <button type="button" disabled className="cr-btn cr-btn--secondary cr-btn--lg">
                  No ticket link
                </button>
              )}
              <ShareButton
                title={`${representative.artistName} — ${representative.venueName}`}
                text={`${representative.artistName} at ${representative.venueName}, ${representative.venueCity} · ${longDate}`}
                className="cr-btn cr-btn--secondary cr-btn--lg"
              />
            </div>

            <div className="text-[13px] text-(--color-text-dim) pt-6 border-t border-(--color-border)">
              First seen <strong className="text-(--color-text-soft) font-medium">{formatRelativeMinutes(representative.createdAt)}</strong> via {SOURCE_LABEL[winnerSource]}.
              We re-check daily — if it gets cancelled or rescheduled, we&apos;ll email you.
            </div>
          </div>
        </section>

        {groupRows.length > 1 && (
          <section className="mb-14">
            <h3 className="cr-section-label mb-4">All sources tracking this show</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-4 p-4 border border-(--color-border) rounded-xl bg-(--color-bg-elev)"
                >
                  <SourceBadge source={row.source} size="full" />
                  <div className="flex-1 min-w-0">
                    {row.ticketUrl && (
                      <div className="text-xs text-(--color-text-dim) truncate">
                        {prettyHost(row.ticketUrl)}
                      </div>
                    )}
                  </div>
                  {row.ticketUrl && (
                    <a
                      href={row.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cr-btn cr-btn--ghost text-xs"
                    >
                      Open ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function DetailRow({
  k,
  v,
  sub,
  last = false,
}: {
  k: string;
  v: React.ReactNode;
  sub?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[40%_1fr] px-5 py-3.5 ${
        last ? "" : "border-b border-(--color-border)"
      }`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-(--color-text-dim) self-start pt-0.5">
        {k}
      </span>
      <span className="font-medium text-[15px]">
        {v}
        {sub && (
          <span className="block text-xs font-normal text-(--color-text-dim) mt-0.5">
            {sub}
          </span>
        )}
      </span>
    </div>
  );
}

function prettyHost(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname;
  } catch {
    return url;
  }
}
