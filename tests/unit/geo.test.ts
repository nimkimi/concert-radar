import { describe, it, expect } from "vitest";
import { haversineKm, countryToTimezone } from "@/lib/geo";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm({ lat: 60.39, lon: 5.32 }, { lat: 60.39, lon: 5.32 })).toBe(0);
  });

  it("returns ~308km between Bergen and Oslo", () => {
    const d = haversineKm({ lat: 60.39, lon: 5.32 }, { lat: 59.91, lon: 10.75 });
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(320);
  });

  it("is symmetric", () => {
    const a = { lat: 60.39, lon: 5.32 };
    const b = { lat: 59.91, lon: 10.75 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });

  it("handles cross-hemisphere distance", () => {
    // Bergen to Sydney is roughly 16000km
    const d = haversineKm({ lat: 60.39, lon: 5.32 }, { lat: -33.87, lon: 151.21 });
    expect(d).toBeGreaterThan(15000);
    expect(d).toBeLessThan(17000);
  });
});

describe("countryToTimezone", () => {
  it.each([
    ["NO", "Europe/Oslo"],
    ["SE", "Europe/Stockholm"],
    ["DK", "Europe/Copenhagen"],
  ])("%s -> %s", (c, tz) => expect(countryToTimezone(c)).toBe(tz));

  it("is case-insensitive", () => {
    expect(countryToTimezone("no")).toBe("Europe/Oslo");
  });

  it("defaults to Europe/Oslo for unknown country code", () => {
    expect(countryToTimezone("ZZ")).toBe("Europe/Oslo");
  });
});
