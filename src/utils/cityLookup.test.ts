import { describe, it, expect } from "vitest";
import { getLanFromCity } from "./cityLookup";

describe("getLanFromCity", () => {
  it("resolves Oxelösund to Södermanlands län", () => {
    expect(getLanFromCity("Oxelösund")).toBe("Södermanlands län");
  });

  it("resolves Kivik to Skåne län", () => {
    expect(getLanFromCity("Kivik")).toBe("Skåne län");
  });

  it("resolves Borlänge to Dalarnas län (case/diacritics)", () => {
    expect(getLanFromCity("borlänge")).toBe("Dalarnas län");
  });

  it("resolves Sundbyberg to Stockholms län", () => {
    expect(getLanFromCity("Sundbyberg")).toBe("Stockholms län");
  });

  it("returns null for unknown city-like gibberish", () => {
    expect(getLanFromCity("NotACityXYZ")).toBeNull();
  });
});
