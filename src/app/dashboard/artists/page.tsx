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

  return (
    <>
      <AppNav activeHref="/dashboard/artists" />
      <main className="cr-frame-wide pt-10 pb-24">
        <div className="flex justify-between items-end gap-6 flex-wrap mb-12">
          <div>
            <h1
              className="font-bold tracking-[-0.035em] leading-[1.05]"
              style={{ fontSize: "clamp(28px, 3.5vw, 40px)" }}
            >
              <span className="text-(--color-green)">{tracked}</span>{" "}
              {tracked === 1 ? "artist" : "artists"} on the radar
            </h1>
            <div className="text-sm text-(--color-text-dim) mt-1.5">
              Pulled from your Spotify · {excluded} {excluded === 1 ? "hidden" : "hidden"} · last sync {formatRelativeMinutes(user.lastArtistSyncAt)}
            </div>
          </div>
          <ResyncArtistsButton />
        </div>

        {/*
          Phase B reskin. Source-by-source grouping (Top listened / Followed /
          Saved albums) needs a `source` column on TrackedArtist — that lands
          in Phase C. For now: flat A→Z list with v2 card styling.
        */}

        {tracked === 0 ? (
          <EmptyState />
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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

        <details className="cr-card mt-10 p-7 max-w-[760px]">
          <summary className="list-none cursor-pointer flex items-center gap-2.5 text-sm font-medium">
            <span className="w-6 h-6 rounded-full bg-(--color-green-soft) text-(--color-green) grid place-items-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </span>
            How we pick these
            <span className="ml-auto text-(--color-text-dim)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </summary>
          <div className="mt-4 pt-4 border-t border-(--color-border) grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-1.5">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded mr-1.5 bg-(--color-bg-subtle) text-(--color-text-soft)">i</span>
                Top tier
              </h4>
              <p className="text-[13px] text-(--color-text-soft) leading-[1.55]">
                Your top 20 most-played artists from Spotify over the last 6 months.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1.5">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded mr-1.5 bg-(--color-bg-subtle) text-(--color-text-soft)">ii</span>
                Followed
              </h4>
              <p className="text-[13px] text-(--color-text-soft) leading-[1.55]">
                Artists you&apos;ve explicitly followed on Spotify.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1.5">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded mr-1.5 bg-(--color-bg-subtle) text-(--color-text-soft)">iii</span>
                Saved albums
              </h4>
              <p className="text-[13px] text-(--color-text-soft) leading-[1.55]">
                Artists derived from albums you&apos;ve saved to your library.
              </p>
            </div>
          </div>
        </details>
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
          <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold mb-2">No tracked artists yet.</h2>
      <p className="text-sm text-(--color-text-soft) max-w-md mx-auto">
        Hit Re-sync from Spotify above to pull your top + followed artists.
      </p>
    </div>
  );
}
