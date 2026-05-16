import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseNominatimResults } from "@/lib/nominatim";

const bergen = JSON.parse(
  readFileSync(join(__dirname, "../../__fixtures__/nominatim/bergen.json"), "utf8"),
);

describe("parseNominatimResults", () => {
  it("filters to NO/SE/DK only", () => {
    const places = parseNominatimResults(bergen);
    expect(places).toHaveLength(2);
    expect(places.every((p) => ["NO", "SE", "DK"].includes(p.country))).toBe(true);
  });

  it("extracts lat/lon as numbers", () => {
    const [first] = parseNominatimResults(bergen);
    expect(first.lat).toBeCloseTo(60.394, 2);
    expect(first.lon).toBeCloseTo(5.326, 2);
    expect(typeof first.lat).toBe("number");
    expect(typeof first.lon).toBe("number");
  });

  it("prefers city, then town, then village for name", () => {
    const places = parseNominatimResults(bergen);
    expect(places[0].name).toBe("Bergen");
    expect(places[1].name).toBe("Bergen");
  });

  it("uppercases country code", () => {
    const [first] = parseNominatimResults(bergen);
    expect(first.country).toBe("NO");
  });

  it("handles missing address gracefully", () => {
    const out = parseNominatimResults([{ lat: "1", lon: "2", display_name: "X" }]);
    expect(out).toEqual([]);
  });

  it("falls back to display_name first segment if no city/town/village", () => {
    const out = parseNominatimResults([
      {
        lat: "55.6761",
        lon: "12.5683",
        display_name: "Nørrebro, Copenhagen, Denmark",
        address: { country_code: "dk", suburb: "Nørrebro" },
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Nørrebro");
    expect(out[0].country).toBe("DK");
  });
});
