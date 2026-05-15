import type { Source } from "@prisma/client";
import { SourceBadge } from "./SourceBadge";

export type ConcertCardProps = {
  imageUrl: string;
  artistName: string;
  venueName: string;
  city: string;
  time: string;
  distanceLabel: string;
  sources: Source[];
};

export function ConcertCard({
  imageUrl,
  artistName,
  venueName,
  city,
  time,
  distanceLabel,
  sources,
}: ConcertCardProps) {
  return (
    <article className="cr-concert-card">
      <img className="cr-concert-card__img" src={imageUrl} alt="" />
      <div className="cr-concert-card__overlay" />
      <div className="cr-concert-card__distance">{distanceLabel}</div>
      <div className="cr-concert-card__sources">
        {sources.map((s) => (
          <SourceBadge key={s} source={s} />
        ))}
      </div>
      <div className="cr-concert-card__body">
        <div className="cr-concert-card__artist">{artistName}</div>
        <div className="cr-concert-card__venue">
          {venueName} · {city}
        </div>
        <div className="cr-concert-card__time">{time}</div>
      </div>
    </article>
  );
}
