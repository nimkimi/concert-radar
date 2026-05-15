import { describe, it, expect } from "vitest";
import { pickPrioritySource } from "@/lib/sources/priority";

describe("pickPrioritySource", () => {
  it("prefers TICKETMASTER over BANDSINTOWN", () => {
    expect(pickPrioritySource(["BANDSINTOWN", "TICKETMASTER"])).toBe("TICKETMASTER");
  });

  it("prefers BILLETTO over BANDSINTOWN", () => {
    expect(pickPrioritySource(["BANDSINTOWN", "BILLETTO"])).toBe("BILLETTO");
  });

  it("uses full priority order: TM > BILLETTO > BIT > SK", () => {
    expect(pickPrioritySource(["SONGKICK", "BANDSINTOWN", "BILLETTO", "TICKETMASTER"]))
      .toBe("TICKETMASTER");
    expect(pickPrioritySource(["SONGKICK", "BANDSINTOWN", "BILLETTO"]))
      .toBe("BILLETTO");
    expect(pickPrioritySource(["SONGKICK", "BANDSINTOWN"]))
      .toBe("BANDSINTOWN");
    expect(pickPrioritySource(["SONGKICK"]))
      .toBe("SONGKICK");
  });

  it("returns the first element when only one source is present", () => {
    expect(pickPrioritySource(["BANDSINTOWN"])).toBe("BANDSINTOWN");
  });

  it("handles duplicate entries", () => {
    expect(pickPrioritySource(["BANDSINTOWN", "BANDSINTOWN", "TICKETMASTER"])).toBe("TICKETMASTER");
  });
});
