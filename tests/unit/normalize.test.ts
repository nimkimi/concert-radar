import { describe, it, expect } from "vitest";
import { normalizeArtistName } from "@/lib/normalize";

describe("normalizeArtistName", () => {
  it.each([
    ["The 1975", "1975"],
    ["Sigur Rós", "sigur ros"],
    ["Beyoncé feat. Jay-Z", "beyonce jay-z"],
    ["Tame Impala (Live)", "tame impala"],
    ["  Spacey  Name  ", "spacey name"],
    ["THE 1975", "1975"],
    ["Mø", "mo"],
    ["Royksopp featuring Robyn", "royksopp robyn"],
    ["Big Thief", "big thief"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeArtistName(input)).toBe(expected);
  });

  it("is idempotent", () => {
    const once = normalizeArtistName("The Sigur Rós (Live)");
    expect(normalizeArtistName(once)).toBe(once);
  });
});
