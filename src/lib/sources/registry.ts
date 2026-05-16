import type { SourceAdapter } from "./types";
import { ticketmaster } from "./ticketmaster";
import { bandsintown } from "./bandsintown";
import { songkick } from "./songkick";
import { billetto } from "./billetto";

// ENABLE_SONGKICK / ENABLE_BILLETTO default to "false" — read at call time so
// tests can flip them without re-importing.
export function activeAdapters(): SourceAdapter[] {
  const adapters: SourceAdapter[] = [ticketmaster, bandsintown];
  if (process.env.ENABLE_SONGKICK === "true") adapters.push(songkick);
  if (process.env.ENABLE_BILLETTO === "true") adapters.push(billetto);
  return adapters;
}
