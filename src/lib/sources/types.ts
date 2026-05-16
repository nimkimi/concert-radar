import type { Source, ConcertStatus } from "@prisma/client";

export type ConcertHit = {
  externalId: string;
  source: Source;
  artistName: string;
  venueName: string;
  venueCity: string;
  venueCountry: string;
  venueTimezone: string;
  latitude?: number;
  longitude?: number;
  eventDate: Date;
  ticketUrl?: string;
  status: ConcertStatus;
};

export interface SourceAdapter {
  source: Source;
  fetchForArtist(args: {
    artistName: string;
    spotifyArtistId: string;
  }): Promise<ConcertHit[]>;
}
