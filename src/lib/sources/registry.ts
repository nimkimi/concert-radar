import type { SourceAdapter } from "./types";
import { ticketmaster } from "./ticketmaster";
import { bandsintown } from "./bandsintown";

// Songkick + Billetto are added in #9, behind ENABLE_SONGKICK / ENABLE_BILLETTO.
export function activeAdapters(): SourceAdapter[] {
  return [ticketmaster, bandsintown];
}
