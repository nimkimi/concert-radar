import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ConcertCard } from "@/components/ConcertCard";
import { ConcertHero } from "@/components/ConcertHero";
import { SyncNowButton } from "@/components/SyncNowButton";
import { auth } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";
import { getDedupedConcertsForUser } from "@/lib/sync";
import { groupByHorizon } from "@/lib/time-horizon";
import { normalizeArtistName } from "@/lib/normalize";
import {
  daysUntil,
  formatDistanceKm,
  formatEventTime,
  formatLongEventDate,
  formatRelativeMinutes,
} from "@/lib/format";

export const dynamic = "force-dynamic";

function shortDatePill(d: Date, tz: string): string {
  // "FRI · MAY 29" in venue tz
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).formatToParts(d);
  const get = (t: string) => fmt.find((p) => p.type === t)?.value ?? "";
  return `${get("weekday").toUpperCase()} · ${get("month").toUpperCase()} ${get("day")}`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      cityName: true,
      radiusKm: true,
      lastConcertSyncAt: true,
    },
  });
  if (!user) redirect("/");

  const tracked = await prisma.trackedArtist.findMany({
    where: { userId: session.user.id, isExcluded: false },
    select: { name: true, imageUrl: true },
  });
  const trackedCount = tracked.length;
  const imageByArtist = new Map<string, string | null>();
  for (const a of tracked) imageByArtist.set(normalizeArtistName(a.name), a.imageUrl);

  const groups = await getDedupedConcertsForUser(prisma, session.user.id);
  const cityLabel = user.cityName ?? "you";
  const radiusLabel = user.radiusKm === 9999 ? "country-wide" : `within ${user.radiusKm} km`;

  // Hero = the very next concert. Time-horizon groups exclude it.
  const hero = groups[0] ?? null;
  const tail = groups.slice(1);
  const horizons = groupByHorizon(tail, (g) => g.representative.eventDate);

  return (
    <>
      <AppNav activeHref="/dashboard" />
      <main className="cr-frame-wide pt-10 pb-24">
        <div className="flex justify-between items-end gap-6 flex-wrap mb-8">
          <div>
            <h1
              className="font-bold tracking-[-0.035em] leading-[1.05]"
              style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}
            >
              {groups.length} upcoming {groups.length === 1 ? "show" : "shows"}{" "}
              <span className="text-(--color-green)">near {cityLabel}</span>
            </h1>
            <div className="text-sm text-(--color-text-dim) mt-1.5">
              {radiusLabel} · {trackedCount} {trackedCount === 1 ? "artist" : "artists"} tracked · last synced {formatRelativeMinutes(user.lastConcertSyncAt)}
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-(--color-bg-subtle) border border-(--color-border) text-sm text-(--color-text-dim)">
            <span className="cr-pulse" />
            Live
            <SyncNowButton />
          </div>
        </div>

        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {hero && (
              <ConcertHero
                href={`/dashboard/concerts/${hero.representative.id}`}
                imageUrl={imageByArtist.get(normalizeArtistName(hero.representative.artistName)) ?? null}
                artistName={hero.representative.artistName}
                venueName={hero.representative.venueName}
                city={hero.representative.venueCity}
                longDate={formatLongEventDate(hero.representative.eventDate, hero.representative.venueTimezone)}
                time={formatEventTime(hero.representative.eventDate, hero.representative.venueTimezone)}
                timezone={hero.representative.venueTimezone}
                distanceLabel={formatDistanceKm(hero.distanceKm)}
                daysUntil={daysUntil(hero.representative.eventDate)}
                sources={hero.sources}
                ticketUrl={hero.representative.ticketUrl}
              />
            )}

            {horizons.length === 0 && hero && (
              <div className="rounded-xl border border-dashed border-(--color-border-strong) bg-(--color-bg-subtle) p-12 text-center">
                <h3 className="text-base font-semibold mb-1.5">That&apos;s your only show on the radar right now.</h3>
                <p className="text-sm text-(--color-text-dim) max-w-md mx-auto">
                  Tours get announced 3–6 months ahead. We&apos;ll email you the moment anything else lands.
                </p>
              </div>
            )}

            {horizons.map(({ horizon, meta, items }) => (
              <section key={horizon} className="mb-12">
                <div className="flex items-baseline justify-between mb-4">
                  <h3 className="cr-section-label">
                    {meta.title}
                    <span className="count">{items.length}</span>
                  </h3>
                  {meta.helper && (
                    <span className="text-xs text-(--color-text-dim)">{meta.helper}</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((g) => {
                    const rep = g.representative;
                    return (
                      <ConcertCard
                        key={g.key}
                        href={`/dashboard/concerts/${rep.id}`}
                        imageUrl={imageByArtist.get(normalizeArtistName(rep.artistName)) ?? null}
                        artistName={rep.artistName}
                        venueName={rep.venueName}
                        city={rep.venueCity}
                        datePill={shortDatePill(rep.eventDate, rep.venueTimezone)}
                        time={formatEventTime(rep.eventDate, rep.venueTimezone)}
                        distanceLabel={formatDistanceKm(g.distanceKm)}
                        sources={g.sources}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-(--color-border-strong) bg-(--color-bg-subtle) py-20 px-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-(--color-bg-elev) border border-(--color-border) grid place-items-center text-(--color-text-dim)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2">No upcoming shows yet.</h2>
      <p className="text-sm text-(--color-text-soft) max-w-md mx-auto mb-6">
        We&apos;ll keep checking every day. Try widening your radius, or hit sync to pull fresh data from Spotify and the ticket sources right now.
      </p>
      <Link href="/dashboard/settings" className="cr-btn cr-btn--secondary cr-btn--lg inline-flex">
        Adjust radius in settings
      </Link>
    </div>
  );
}
