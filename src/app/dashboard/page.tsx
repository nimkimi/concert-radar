import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ConcertCard } from "@/components/ConcertCard";
import { DateGroup } from "@/components/DateGroup";
import { SyncNowButton } from "@/components/SyncNowButton";
import { auth } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";
import { getDedupedConcertsForUser } from "@/lib/sync";
import { normalizeArtistName } from "@/lib/normalize";
import {
  dateGroupKey,
  dateGroupParts,
  formatDistanceKm,
  formatEventTime,
  formatRelativeMinutes,
} from "@/lib/format";

export const dynamic = "force-dynamic";

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

  const now = new Date();
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeek = groups.filter((g) => g.representative.eventDate <= oneWeek).length;

  const radiusLabel =
    user.radiusKm === 9999 ? "Country-wide (NO+SE+DK)" : `Within ${user.radiusKm} km`;

  // Group by representative's date (in venue tz) preserving order.
  const buckets = new Map<
    string,
    { date: Date; tz: string; items: typeof groups }
  >();
  for (const g of groups) {
    const tz = g.representative.venueTimezone;
    const key = dateGroupKey(g.representative.eventDate, tz);
    const bucket = buckets.get(key);
    if (bucket) bucket.items.push(g);
    else buckets.set(key, { date: g.representative.eventDate, tz, items: [g] });
  }

  return (
    <>
      <AppNav activeHref="/dashboard" userName={user.name ?? undefined} />
      <main className="cr-frame">
        <header className="pt-14 pb-5 flex items-end justify-between gap-5 flex-wrap">
          <h1
            className="font-black uppercase leading-[0.88] tracking-[-0.05em] max-w-[900px]"
            style={{ fontSize: "var(--text-display)" }}
          >
            <span
              style={{ WebkitTextStroke: "2px var(--color-text)", color: "transparent" }}
            >
              {groups.length}
            </span>
            <br />
            upcoming shows near{" "}
            <span className="text-(--color-spotify)">{user.cityName ?? "you"}</span>.
          </h1>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-2">
              <span className="cr-chip cr-chip--accent">{radiusLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-(--color-text-dim)">
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full bg-(--color-spotify)"
              />
              Last synced {formatRelativeMinutes(user.lastConcertSyncAt)}
              <SyncNowButton />
            </div>
          </div>
        </header>

        <div
          className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-(--color-border) py-4 mb-12"
        >
          <Stat label="Upcoming" value={String(groups.length)} />
          <Stat label="This week" value={String(thisWeek)} valueClass="text-(--color-spotify)" />
          <Stat label="Tracked artists" value={String(trackedCount)} />
          <Stat label="Sources active" value="2 / 4" />
        </div>

        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          [...buckets.entries()].map(([key, { date, tz, items }]) => {
            const parts = dateGroupParts(date, tz);
            const cities = new Set(items.map((g) => g.representative.venueCity));
            const cityLabel = cities.size === 1 ? `· all in ${[...cities][0]}` : `· ${cities.size} cities`;
            return (
              <DateGroup
                key={key}
                weekday={parts.weekday}
                day={parts.day}
                month={parts.month}
                rightLabel={`${items.length} ${items.length === 1 ? "show" : "shows"} ${cityLabel}`}
              >
                {items.map((g) => {
                  const rep = g.representative;
                  const img = imageByArtist.get(normalizeArtistName(rep.artistName)) ?? null;
                  return (
                    <ConcertCard
                      key={g.key}
                      href={`/dashboard/concerts/${rep.id}`}
                      imageUrl={img}
                      artistName={rep.artistName}
                      venueName={rep.venueName}
                      city={rep.venueCity}
                      time={formatEventTime(rep.eventDate, rep.venueTimezone)}
                      distanceLabel={formatDistanceKm(g.distanceKm)}
                      sources={g.sources}
                    />
                  );
                })}
              </DateGroup>
            );
          })
        )}

        {groups.length > 0 && (
          <div className="py-12 text-center text-sm text-(--color-text-dim)">
            End of feed · increase your radius in{" "}
            <Link
              href="/dashboard/settings"
              className="text-(--color-spotify) underline"
            >
              settings
            </Link>{" "}
            to see more.
          </div>
        )}
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="px-5 border-r border-(--color-border) last:border-r-0">
      <div className="text-[11px] uppercase tracking-[0.12em] text-(--color-text-dim) font-semibold">
        {label}
      </div>
      <div
        className={`font-extrabold tracking-[-0.03em] mt-0.5 ${valueClass ?? ""}`}
        style={{ fontSize: 36 }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-20 text-center">
      <div className="text-2xl font-bold mb-3">No upcoming shows yet.</div>
      <p className="text-(--color-text-muted) mb-6 max-w-md mx-auto">
        We&apos;ll keep checking. You can try increasing your radius or syncing now to pull
        fresh data from Spotify and the ticket sources.
      </p>
      <Link
        href="/dashboard/settings"
        className="cr-btn cr-btn--ghost inline-flex"
      >
        Adjust radius in settings
      </Link>
    </div>
  );
}
