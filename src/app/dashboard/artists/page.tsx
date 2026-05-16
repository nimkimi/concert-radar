import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ArtistCard } from "@/components/ArtistCard";
import { ResyncArtistsButton } from "@/components/ResyncArtistsButton";
import { auth } from "@/lib/auth/nextauth";
import { prisma } from "@/lib/db";
import { normalizeArtistName } from "@/lib/normalize";
import { formatRelativeMinutes } from "@/lib/format";

export const dynamic = "force-dynamic";

function primaryGenre(genres: string): string | null {
  const first = genres.split(",")[0]?.trim();
  return first || null;
}

export default async function ArtistsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, lastArtistSyncAt: true },
  });
  if (!user) redirect("/");

  const artists = await prisma.trackedArtist.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isExcluded: "asc" }, { name: "asc" }],
  });

  // Count upcoming concerts per normalized artist name.
  const now = new Date();
  const upcoming = await prisma.concert.findMany({
    where: { eventDate: { gt: now }, status: { not: "CANCELLED" } },
    select: { artistName: true },
  });
  const showCount = new Map<string, number>();
  for (const c of upcoming) {
    const k = normalizeArtistName(c.artistName);
    showCount.set(k, (showCount.get(k) ?? 0) + 1);
  }

  const tracked = artists.length;
  const excluded = artists.filter((a) => a.isExcluded).length;
  const withShows = artists.filter(
    (a) => !a.isExcluded && (showCount.get(normalizeArtistName(a.name)) ?? 0) > 0,
  ).length;

  return (
    <>
      <AppNav activeHref="/dashboard/artists" userName={user.name ?? undefined} />
      <main className="cr-frame">
        <header className="pt-14 pb-5 flex items-end justify-between gap-5 flex-wrap">
          <h1
            className="font-black uppercase leading-[0.88] tracking-[-0.05em]"
            style={{ fontSize: "var(--text-display)" }}
          >
            Your <span className="text-(--color-spotify)">artists</span>.
          </h1>
          <ResyncArtistsButton />
        </header>

        <div className="flex gap-10 pt-5 pb-6 border-t border-(--color-border) mb-6 flex-wrap">
          <SummaryStat value={String(tracked)} label="Tracked" />
          <SummaryStat
            value={String(withShows)}
            label="With shows"
            valueColor="var(--color-spotify)"
          />
          <SummaryStat
            value={String(excluded)}
            label="Excluded"
            valueColor="var(--color-text-muted)"
          />
          <SummaryStat
            value={formatRelativeMinutes(user.lastArtistSyncAt)}
            label="Last synced"
            valueColor="var(--color-magenta)"
            small
          />
        </div>

        {tracked === 0 ? (
          <EmptyState />
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
            {artists.map((a) => (
              <ArtistCard
                key={a.id}
                id={a.id}
                name={a.name}
                imageUrl={a.imageUrl}
                genre={primaryGenre(a.genres)}
                upcomingShowCount={showCount.get(normalizeArtistName(a.name)) ?? 0}
                isExcluded={a.isExcluded}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}

function SummaryStat({
  value,
  label,
  valueColor,
  small,
}: {
  value: string;
  label: string;
  valueColor?: string;
  small?: boolean;
}) {
  return (
    <div>
      <div
        className="font-black leading-none tracking-[-0.04em]"
        style={{
          fontSize: small ? 36 : 56,
          color: valueColor,
        }}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-[0.12em] text-(--color-text-muted) font-bold mt-2">
        {label}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-20 text-center text-(--color-text-muted)">
      <div className="text-2xl font-bold mb-3 text-(--color-text)">
        No tracked artists yet.
      </div>
      <p className="max-w-md mx-auto mb-6">
        Hit{" "}
        <span className="text-(--color-spotify-bright)">Re-sync from Spotify</span>{" "}
        above to pull your top + followed artists.
      </p>
    </div>
  );
}
