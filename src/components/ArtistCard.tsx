import { ExcludeToggle } from "./ExcludeToggle";

export type ArtistCardProps = {
  id: string;
  name: string;
  imageUrl: string | null;
  genre: string | null;
  upcomingShowCount: number;
  isExcluded: boolean;
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#1db954'/>
          <stop offset='100%' stop-color='#ff2e88'/>
        </linearGradient>
      </defs>
      <rect width='400' height='400' fill='url(#g)'/>
    </svg>`,
  ).toString("base64");

export function ArtistCard({
  id,
  name,
  imageUrl,
  genre,
  upcomingShowCount,
  isExcluded,
}: ArtistCardProps) {
  const showsLabel =
    upcomingShowCount === 0
      ? isExcluded
        ? "Hidden"
        : "No upcoming"
      : `${upcomingShowCount} upcoming show${upcomingShowCount === 1 ? "" : "s"}`;
  const isZero = upcomingShowCount === 0;

  return (
    <article
      className="relative overflow-hidden rounded-(--radius-md) bg-(--color-surface) cursor-default"
      style={{ aspectRatio: "1 / 1.2", transition: "transform 200ms" }}
    >
      <img
        className="absolute inset-0 w-full object-cover"
        style={{
          height: "70%",
          filter: isExcluded ? "grayscale(1) brightness(0.5)" : undefined,
        }}
        src={imageUrl ?? FALLBACK_IMAGE}
        alt=""
        loading="lazy"
      />
      {genre && (
        <span
          className="absolute top-3 left-3 text-[11px] uppercase tracking-[0.1em] font-bold px-2 py-1 rounded-(--radius-pill)"
          style={{
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            maxWidth: "calc(100% - 60px)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {genre}
        </span>
      )}
      <ExcludeToggle artistId={id} initialExcluded={isExcluded} />
      <div
        className="absolute inset-x-0 bottom-0 px-4 pt-3 pb-4 border-t border-(--color-border) bg-(--color-surface)"
      >
        <div
          className={`text-base font-bold tracking-tight ${
            isExcluded ? "line-through text-(--color-text-dim)" : ""
          }`}
        >
          {name}
        </div>
        <div
          className={`text-xs mt-0.5 flex items-center gap-1.5 ${
            isZero ? "text-(--color-text-dim)" : "text-(--color-text-muted)"
          }`}
        >
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isZero
                ? "var(--color-text-dim)"
                : "var(--color-spotify)",
            }}
          />
          {showsLabel}
        </div>
      </div>
    </article>
  );
}
