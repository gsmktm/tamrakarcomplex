import { describe, expect, it } from "vitest";
import { sortByProductionDate } from "./productionDateSort";

describe("sortByProductionDate", () => {
  it("places newest production years first and undated models last", () => {
    const result = sortByProductionDate([
      { name: "Model 2023", release_year: 2023 },
      { name: "Unknown", release_year: null },
      { name: "Model 2025", release_year: 2025 },
      { name: "Model 2024", release_year: 2024 },
    ]);

    expect(result.map((item) => item.name)).toEqual([
      "Model 2025",
      "Model 2024",
      "Model 2023",
      "Unknown",
    ]);
  });

  it("retains source order for models produced in the same year", () => {
    const result = sortByProductionDate([
      { name: "Pro", release_year: 2025 },
      { name: "Standard", release_year: 2025 },
    ]);

    expect(result.map((item) => item.name)).toEqual(["Pro", "Standard"]);
  });
});

