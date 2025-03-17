import { describe, expect, it } from "vitest";
import type { Product } from "@/server/db/schema";
import { categoryOptions, filterProducts } from "./lib";

function product(over: Partial<Product>): Product {
  return {
    articleNumber: "MEG-20W50-208",
    name: "Meguin 20W50",
    unit: "Drum (208L)",
    category: "Engine Oil",
    pricePaisas: 100_000n,
    active: true,
    createdAt: new Date("2026-01-01"),
    ...over,
  };
}

const rows = [
  product({
    articleNumber: "MEG-20W50-208",
    name: "Meguin 20W50",
    category: "Engine Oil",
  }),
  product({
    articleNumber: "MEG-ATF-20",
    name: "Meguin ATF",
    category: "Transmission",
  }),
  product({
    articleNumber: "CAS-GREASE-5",
    name: "Castrol Grease",
    category: "Grease",
  }),
];

describe("filterProducts", () => {
  it("returns all rows when no filters are applied", () => {
    expect(filterProducts(rows, {})).toHaveLength(3);
  });

  it("treats the 'All' category as no constraint", () => {
    expect(filterProducts(rows, { category: "All" })).toHaveLength(3);
  });

  it("treats an empty search as no constraint", () => {
    expect(filterProducts(rows, { search: "   " })).toHaveLength(3);
  });

  it("filters by an exact category match", () => {
    const result = filterProducts(rows, { category: "Grease" });
    expect(result.map((p) => p.articleNumber)).toEqual(["CAS-GREASE-5"]);
  });

  it("returns nothing for an unknown category", () => {
    expect(filterProducts(rows, { category: "Coolant" })).toHaveLength(0);
  });

  it("matches search by name, case-insensitively", () => {
    const result = filterProducts(rows, { search: "meguin atf" });
    expect(result.map((p) => p.articleNumber)).toEqual(["MEG-ATF-20"]);
  });

  it("matches search by article number, case-insensitively", () => {
    const result = filterProducts(rows, { search: "cas-grease" });
    expect(result.map((p) => p.articleNumber)).toEqual(["CAS-GREASE-5"]);
  });

  it("matches search by category, case-insensitively", () => {
    const result = filterProducts(rows, { search: "transmission" });
    expect(result.map((p) => p.articleNumber)).toEqual(["MEG-ATF-20"]);
  });

  it("returns nothing when the search hits nothing", () => {
    expect(filterProducts(rows, { search: "nonexistent" })).toHaveLength(0);
  });

  it("trims surrounding whitespace before matching the search", () => {
    const result = filterProducts(rows, { search: "  castrol  " });
    expect(result.map((p) => p.articleNumber)).toEqual(["CAS-GREASE-5"]);
  });

  it("applies category and search together (combined match)", () => {
    const result = filterProducts(rows, {
      category: "Engine Oil",
      search: "meguin",
    });
    expect(result.map((p) => p.articleNumber)).toEqual(["MEG-20W50-208"]);
  });

  it("returns nothing when category and search disagree", () => {
    const result = filterProducts(rows, {
      category: "Engine Oil",
      search: "castrol",
    });
    expect(result).toHaveLength(0);
  });
});

describe("categoryOptions", () => {
  it("returns 'All' first, then the unique categories sorted", () => {
    expect(categoryOptions(rows)).toEqual([
      "All",
      "Engine Oil",
      "Grease",
      "Transmission",
    ]);
  });

  it("deduplicates repeated categories", () => {
    const dupes = [
      product({ articleNumber: "A", category: "Engine Oil" }),
      product({ articleNumber: "B", category: "Engine Oil" }),
    ];
    expect(categoryOptions(dupes)).toEqual(["All", "Engine Oil"]);
  });

  it("returns just 'All' for an empty catalogue", () => {
    expect(categoryOptions([])).toEqual(["All"]);
  });
});
