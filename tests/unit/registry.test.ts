import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { activeAdapters } from "@/lib/sources/registry";

describe("activeAdapters", () => {
  const original = {
    ENABLE_SONGKICK: process.env.ENABLE_SONGKICK,
    ENABLE_BILLETTO: process.env.ENABLE_BILLETTO,
  };

  beforeEach(() => {
    delete process.env.ENABLE_SONGKICK;
    delete process.env.ENABLE_BILLETTO;
  });

  afterEach(() => {
    process.env.ENABLE_SONGKICK = original.ENABLE_SONGKICK;
    process.env.ENABLE_BILLETTO = original.ENABLE_BILLETTO;
  });

  it("defaults to Ticketmaster + Bandsintown only", () => {
    expect(activeAdapters().map((a) => a.source)).toEqual(["TICKETMASTER", "BANDSINTOWN"]);
  });

  it("adds Songkick when ENABLE_SONGKICK=true", () => {
    process.env.ENABLE_SONGKICK = "true";
    expect(activeAdapters().map((a) => a.source)).toContain("SONGKICK");
  });

  it("adds Billetto when ENABLE_BILLETTO=true", () => {
    process.env.ENABLE_BILLETTO = "true";
    expect(activeAdapters().map((a) => a.source)).toContain("BILLETTO");
  });

  it("any value other than literal 'true' is treated as off", () => {
    process.env.ENABLE_SONGKICK = "1";
    process.env.ENABLE_BILLETTO = "yes";
    const sources = activeAdapters().map((a) => a.source);
    expect(sources).not.toContain("SONGKICK");
    expect(sources).not.toContain("BILLETTO");
  });
});
