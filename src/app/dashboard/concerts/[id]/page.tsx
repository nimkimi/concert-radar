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

const STATUS_COLOR = {
  UPCOMING: "var(--color-spotify)",
  CANCELLED: "var(--color-source-bandsintown)",
  POSTPONED: "var(--color-gold)",
} as const;

const FALLBACK_HERO =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 1200'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#1db954'/>
          <stop offset='100%' stop-color='#5b3ff5'/>
        </linearGradient>
      </defs>
      <rect width='2000' height='1200' fill='url(#g)'/>
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

  // Find every Concert row that lives in the same dedup group (same
  // normalized artist + city + day) so we can list every source for this show.
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

  // Match the artist by normalized name (#27 will push this to SQL).
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

  return (
    <>
      <AppNav activeHref="/dashboard" userName={user.name ?? undefined} />

      <div className="relative overflow-hidden" style={{ height: "60vh", minHeight: 480 }}>
        <img
          src={heroImage ?? FALLBACK_HERO}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scale(1.05)", filter: "saturate(1.1)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,10,10,0.4) 0%, rgba(10,10,10,0.2) 40%, var(--color-bg) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 80%, rgba(255, 46, 136, 0.25), transparent 50%)",
            mixBlendMode: "screen",
          }}
        />
        <Link
          href="/dashboard"
          className="cr-btn cr-btn--ghost absolute"
          style={{ top: 20, left: 40, zIndex: 3 }}
        >
          ← Back
        </Link>
      </div>

      <main className="cr-frame">
        <div className="relative z-[2]" style={{ marginTop: -200, paddingBottom: 56 }}>
          <div className="flex gap-2 mb-4">
            {sources.map((s) => (
              <SourceBadge key={s} source={s} size="full" />
            ))}
          </div>
          <h1
            className="font-black uppercase leading-[0.85] tracking-[-0.06em]"
            style={{ fontSize: "clamp(56px, 12vw, 180px)" }}
          >
            <span className="text-(--color-spotify)">{representative.artistName}</span>
          </h1>
          <div className="flex gap-5 items-center mt-5 text-(--color-text-muted) text-[15px] flex-wrap">
            <span>
              {longDate} · {time}
            </span>
            <span className="text-(--color-text-dim)">·</span>
            <span>
              {representative.venueName}, {representative.venueCity}
            </span>
            {distLabel && (
              <>
                <span className="text-(--color-text-dim)">·</span>
                <span>{distLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[2fr_1fr] gap-10 pb-20">
          <div>
            <InfoBlock label="Venue">
              <div
                className="grid items-center p-4 border border-(--color-border) bg-(--color-surface)"
                style={{
                  gridTemplateColumns: "100px 1fr",
                  gap: 16,
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "var(--radius-sm)",
                    background:
                      "radial-gradient(circle at 60% 50%, var(--color-spotify) 0%, var(--color-spotify) 4px, transparent 5px), linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)",
                  }}
                />
                <div>
                  <div className="text-lg font-bold">{representative.venueName}</div>
                  <div className="text-sm text-(--color-text-muted) mt-0.5 leading-snug">
                    {representative.venueCity}, {representative.venueCountry}
                  </div>
                </div>
              </div>
            </InfoBlock>

            <InfoBlock label="When (venue local time)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="text-[22px] font-semibold tracking-tight">
                    {longDate}
                  </div>
                  <div className="text-sm text-(--color-text-muted) mt-1">{time}</div>
                </div>
                <div>
                  <div className="text-[22px] font-semibold tracking-tight">
                    {dUntil <= 0 ? "Today" : `In ${dUntil} day${dUntil === 1 ? "" : "s"}`}
                  </div>
                  <div className="text-sm text-(--color-text-muted) mt-1">
                    Time zone: {tz}
                  </div>
                </div>
              </div>
            </InfoBlock>

            <InfoBlock label="Sources tracking this show">
              <div className="flex flex-col gap-3">
                {groupRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between p-3 px-4 border border-(--color-border) rounded-(--radius-md)"
                  >
                    <div className="flex items-center gap-3">
                      <SourceBadge source={row.source} />
                      <div>
                        <div className="font-semibold">{SOURCE_LABEL[row.source]}</div>
                        {row.ticketUrl && (
                          <div className="text-xs text-(--color-text-dim) mt-0.5 max-w-[400px] truncate">
                            {prettyHost(row.ticketUrl)}
                          </div>
                        )}
                      </div>
                    </div>
                    {row.ticketUrl && (
                      <a
                        href={row.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cr-btn cr-btn--ghost"
                        style={{ height: 36, padding: "0 16px", fontSize: 13 }}
                      >
                        Open ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </InfoBlock>
          </div>

          <aside
            className="lg:sticky lg:top-[100px] h-fit p-6 border border-(--color-border)"
            style={{
              borderRadius: "var(--radius-lg)",
              background: "rgba(30,30,30,0.4)",
              backdropFilter: "blur(12px)",
            }}
          >
            {winnerRow.ticketUrl ? (
              <a
                href={winnerRow.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="cr-btn cr-btn--spotify w-full block text-center"
              >
                Get Tickets →
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="cr-btn cr-btn--spotify w-full"
              >
                No ticket link
              </button>
            )}
            <div className="mt-3">
              <ShareButton
                title={`${representative.artistName} — ${representative.venueName}`}
                text={`${representative.artistName} at ${representative.venueName}, ${representative.venueCity} · ${longDate}`}
                className="cr-btn cr-btn--ghost w-full"
              />
            </div>
            <div className="h-px bg-(--color-border) my-5" />
            <SidebarRow label="Source priority" value={SOURCE_LABEL[winnerSource]} />
            <SidebarRow
              label="Status"
              value={
                <span style={{ color: STATUS_COLOR[status] }}>
                  ● {STATUS_LABEL[status]}
                </span>
              }
            />
            <SidebarRow
              label="First found"
              value={formatRelativeMinutes(representative.createdAt)}
            />
          </aside>
        </div>
      </main>
    </>
  );
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-6 border-t border-(--color-border) first:border-t-0 first:pt-0">
      <div className="text-[11px] uppercase tracking-[0.16em] text-(--color-text-dim) font-bold mb-3">
        {label}
      </div>
      {children}
    </div>
  );
}

function SidebarRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-sm py-2">
      <span className="text-(--color-text-muted)">{label}</span>
      <span>{value}</span>
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
