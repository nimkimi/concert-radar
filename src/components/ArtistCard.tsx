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
      <rect width='400' height='400' fill='#1a1a1a'/>
      <circle cx='200' cy='200' r='80' fill='#1db954' fill-opacity='0.18'/>
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
  const hasShows = upcomingShowCount > 0;
  const showsLabel =
    upcomingShowCount === 0
      ? isExcluded
        ? "Hidden"
        : "0 upcoming"
      : `${upcomingShowCount} upcoming`;

  return (
    <article
      className={`cr-card group relative p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:border-(--color-border-strong) ${
        isExcluded ? "opacity-55" : ""
      }`}
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      {/* Soft green glow on hover, top-left only */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 30% 0%, var(--color-green-soft), transparent 60%)",
        }}
      />
      <ExcludeToggle artistId={id} initialExcluded={isExcluded} />

      <div
        className="relative aspect-square rounded-lg overflow-hidden bg-(--color-bg-subtle) mb-3.5"
        style={{
          filter: isExcluded ? "grayscale(1)" : undefined,
        }}
      >
        <img
          src={imageUrl ?? FALLBACK_IMAGE}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
        />
      </div>
      <div className="text-[15px] font-semibold tracking-[-0.015em] truncate">{name}</div>
      <div className="text-xs text-(--color-text-dim) mt-0.5 truncate">
        {genre ?? "—"}
      </div>
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-(--color-border)">
        <span className="text-xs font-medium text-(--color-text-soft)">
          <span
            className={
              isExcluded || !hasShows
                ? "text-(--color-text-dim)"
                : "text-(--color-green) font-semibold"
            }
          >
            {showsLabel.split(" ")[0]}
          </span>{" "}
          {showsLabel.split(" ").slice(1).join(" ")}
        </span>
      </div>
    </article>
  );
}
