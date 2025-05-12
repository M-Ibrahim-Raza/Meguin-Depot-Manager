import { describe, expect, it } from "vitest";
import {
  addQty,
  calculateAvailableByLocation,
  filterStockRows,
  fmtQty,
  sortStockRows,
  stockFilterSchema,
  stockMovementFilterSchema,
  stockStatus,
  validateStockAvailable,
  type StockShortageItem,
} from "./lib";

describe("stockStatus", () => {
  it("is out at zero or below", () => {
    expect(stockStatus(0, 10)).toBe("out");
    expect(stockStatus(-3, 10)).toBe("out");
    expect(stockStatus(0, null)).toBe("out");
  });

  it("is low at or below the reorder level", () => {
    expect(stockStatus(10, 10)).toBe("low");
    expect(stockStatus(4, 10)).toBe("low");
  });

  it("is ok above the reorder level", () => {
    expect(stockStatus(11, 10)).toBe("ok");
  });

  it("is ok (never low) when no reorder level is set", () => {
    expect(stockStatus(1, null)).toBe("ok");
    expect(stockStatus(9999, null)).toBe("ok");
  });
});

describe("addQty", () => {
  it("adds and subtracts at 3-decimal precision", () => {
    expect(addQty(10, -4)).toBe(6);
    expect(addQty(1.5, 0.25)).toBe(1.75);
  });

  it("rounds to 3 decimals (no float drift)", () => {
    expect(addQty(0.1, 0.2)).toBe(0.3);
    expect(addQty(5, 0.001)).toBe(5.001);
  });

  it("can produce negatives (enforcement happens at the repo)", () => {
    expect(addQty(2, -5)).toBe(-3);
  });
});

describe("fmtQty", () => {
  it("drops trailing zeros", () => {
    expect(fmtQty("4.000")).toBe("4");
    expect(fmtQty("1.500")).toBe("1.5");
    expect(fmtQty(120)).toBe("120");
  });

  it("treats null/undefined as 0", () => {
    expect(fmtQty(null)).toBe("0");
    expect(fmtQty(undefined)).toBe("0");
  });
});

// --- Stock availability / shortage detection -------------------------------

type AvailRow = {
  articleNumber: string;
  warehouseQty: number;
  officeQty: number;
};

function availRow(over: Partial<AvailRow> = {}): AvailRow {
  return { articleNumber: "A1", warehouseQty: 0, officeQty: 0, ...over };
}

type ReqItem = {
  articleNumber: string;
  location: "warehouse" | "office";
  qty: number;
};

function reqItem(over: Partial<ReqItem> = {}): ReqItem {
  return { articleNumber: "A1", location: "warehouse", qty: 1, ...over };
}

describe("calculateAvailableByLocation", () => {
  it("builds a map keyed by article::location for each row", () => {
    const map = calculateAvailableByLocation([
      availRow({ articleNumber: "A1", warehouseQty: 5, officeQty: 2 }),
      availRow({ articleNumber: "B2", warehouseQty: 0, officeQty: 9 }),
    ]);
    expect(map.get("A1::warehouse")).toBe(5);
    expect(map.get("A1::office")).toBe(2);
    expect(map.get("B2::warehouse")).toBe(0);
    expect(map.get("B2::office")).toBe(9);
    expect(map.size).toBe(4);
  });

  it("is empty for no rows", () => {
    expect(calculateAvailableByLocation([]).size).toBe(0);
  });
});

describe("validateStockAvailable", () => {
  it("reports no shortages when stock is sufficient", () => {
    const avail = calculateAvailableByLocation([
      availRow({ warehouseQty: 10, officeQty: 3 }),
    ]);
    const shortages = validateStockAvailable(
      [reqItem({ qty: 4 }), reqItem({ location: "office", qty: 1 })],
      avail,
    );
    expect(shortages).toEqual([]);
  });

  it("treats exactly draining a location (zero remaining) as OK", () => {
    const avail = calculateAvailableByLocation([availRow({ warehouseQty: 5 })]);
    const shortages = validateStockAvailable([reqItem({ qty: 5 })], avail);
    expect(shortages).toEqual([]);
  });

  it("flags a shortage when requested exceeds available by 1", () => {
    const avail = calculateAvailableByLocation([availRow({ warehouseQty: 5 })]);
    const shortages = validateStockAvailable([reqItem({ qty: 6 })], avail);
    expect(shortages).toEqual<StockShortageItem[]>([
      {
        articleNumber: "A1",
        location: "warehouse",
        requested: 6,
        available: 5,
      },
    ]);
  });

  it("sums split lines for the same article+location before comparing", () => {
    const avail = calculateAvailableByLocation([availRow({ warehouseQty: 5 })]);
    // 3 + 3 = 6 > 5 → one shortage for the merged key.
    const shortages = validateStockAvailable(
      [reqItem({ qty: 3 }), reqItem({ qty: 3 })],
      avail,
    );
    expect(shortages).toEqual<StockShortageItem[]>([
      {
        articleNumber: "A1",
        location: "warehouse",
        requested: 6,
        available: 5,
      },
    ]);
  });

  it("does not merge across different locations of the same article", () => {
    const avail = calculateAvailableByLocation([
      availRow({ warehouseQty: 5, officeQty: 5 }),
    ]);
    // warehouse 3 ok, office 6 short
    const shortages = validateStockAvailable(
      [reqItem({ qty: 3 }), reqItem({ location: "office", qty: 6 })],
      avail,
    );
    expect(shortages).toEqual<StockShortageItem[]>([
      {
        articleNumber: "A1",
        location: "office",
        requested: 6,
        available: 5,
      },
    ]);
  });

  it("treats a missing key as zero available", () => {
    const avail = calculateAvailableByLocation([]);
    const shortages = validateStockAvailable([reqItem({ qty: 2 })], avail);
    expect(shortages).toEqual<StockShortageItem[]>([
      {
        articleNumber: "A1",
        location: "warehouse",
        requested: 2,
        available: 0,
      },
    ]);
  });
});

// --- Stock table filter + sort ---------------------------------------------

type Row = {
  articleNumber: string;
  name: string;
  category: string;
  quantityOnHand: number;
  reorderLevel: number | null;
};

function stockRow(over: Partial<Row> = {}): Row {
  return {
    articleNumber: "A1",
    name: "Alpha",
    category: "Engine Oil",
    quantityOnHand: 10,
    reorderLevel: null,
    ...over,
  };
}

describe("filterStockRows", () => {
  const rows = [
    stockRow({
      articleNumber: "A1",
      name: "Alpha",
      category: "Engine Oil",
      quantityOnHand: 10,
      reorderLevel: 5,
    }),
    stockRow({
      articleNumber: "B2",
      name: "Beta",
      category: "Grease",
      quantityOnHand: 2,
      reorderLevel: 5,
    }),
    stockRow({
      articleNumber: "C3",
      name: "Gamma",
      category: "Grease",
      quantityOnHand: 0,
      reorderLevel: null,
    }),
  ];

  it("returns all rows with the default (empty) filters", () => {
    const out = filterStockRows(rows, {
      search: "",
      category: "All",
      lowOnly: false,
    });
    expect(out.map((r) => r.articleNumber)).toEqual(["A1", "B2", "C3"]);
  });

  it("matches search against name (case-insensitive, trimmed)", () => {
    const out = filterStockRows(rows, {
      search: "  bEt ",
      category: "All",
      lowOnly: false,
    });
    expect(out.map((r) => r.articleNumber)).toEqual(["B2"]);
  });

  it("matches search against article number", () => {
    const out = filterStockRows(rows, {
      search: "c3",
      category: "All",
      lowOnly: false,
    });
    expect(out.map((r) => r.articleNumber)).toEqual(["C3"]);
  });

  it("matches search against category", () => {
    const out = filterStockRows(rows, {
      search: "grease",
      category: "All",
      lowOnly: false,
    });
    expect(out.map((r) => r.articleNumber)).toEqual(["B2", "C3"]);
  });

  it("drops rows that miss the search", () => {
    const out = filterStockRows(rows, {
      search: "zzz",
      category: "All",
      lowOnly: false,
    });
    expect(out).toEqual([]);
  });

  it("filters by an exact category and ignores 'All'", () => {
    const out = filterStockRows(rows, {
      search: "",
      category: "Grease",
      lowOnly: false,
    });
    expect(out.map((r) => r.articleNumber)).toEqual(["B2", "C3"]);
  });

  it("low-only keeps out/low rows and drops ok rows", () => {
    const out = filterStockRows(rows, {
      search: "",
      category: "All",
      lowOnly: true,
    });
    // A1 (10 > reorder 5) is ok → dropped; B2 (2 <= 5) low; C3 (0) out
    expect(out.map((r) => r.articleNumber)).toEqual(["B2", "C3"]);
  });

  it("combines category and search predicates", () => {
    const out = filterStockRows(rows, {
      search: "gamma",
      category: "Grease",
      lowOnly: false,
    });
    expect(out.map((r) => r.articleNumber)).toEqual(["C3"]);
  });
});

describe("sortStockRows", () => {
  const rows = [
    stockRow({
      articleNumber: "A1",
      name: "Charlie",
      quantityOnHand: 5,
      reorderLevel: null,
    }),
    stockRow({
      articleNumber: "B2",
      name: "Alpha",
      quantityOnHand: 0,
      reorderLevel: 3,
    }),
    stockRow({
      articleNumber: "C3",
      name: "Bravo",
      quantityOnHand: 2,
      reorderLevel: 3,
    }),
  ];

  it("sorts by name ascending", () => {
    const out = sortStockRows(rows, "name", "asc");
    expect(out.map((r) => r.name)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("sorts by name descending", () => {
    const out = sortStockRows(rows, "name", "desc");
    expect(out.map((r) => r.name)).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("sorts by quantity ascending", () => {
    const out = sortStockRows(rows, "quantityOnHand", "asc");
    expect(out.map((r) => r.quantityOnHand)).toEqual([0, 2, 5]);
  });

  it("sorts by quantity descending", () => {
    const out = sortStockRows(rows, "quantityOnHand", "desc");
    expect(out.map((r) => r.quantityOnHand)).toEqual([5, 2, 0]);
  });

  it("sorts by status (out, low, ok) ascending, breaking ties on name", () => {
    const out = sortStockRows(rows, "status", "asc");
    // B2 out, C3 low, A1 ok
    expect(out.map((r) => r.articleNumber)).toEqual(["B2", "C3", "A1"]);
  });

  it("sorts by status descending", () => {
    const out = sortStockRows(rows, "status", "desc");
    expect(out.map((r) => r.articleNumber)).toEqual(["A1", "C3", "B2"]);
  });

  it("breaks status ties by name, scaled by direction", () => {
    const tied = [
      stockRow({
        articleNumber: "X",
        name: "Zed",
        quantityOnHand: 1,
        reorderLevel: null,
      }),
      stockRow({
        articleNumber: "Y",
        name: "Abe",
        quantityOnHand: 1,
        reorderLevel: null,
      }),
    ];
    expect(sortStockRows(tied, "status", "asc").map((r) => r.name)).toEqual([
      "Abe",
      "Zed",
    ]);
    expect(sortStockRows(tied, "status", "desc").map((r) => r.name)).toEqual([
      "Zed",
      "Abe",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...rows];
    sortStockRows(input, "name", "asc");
    expect(input.map((r) => r.articleNumber)).toEqual(["A1", "B2", "C3"]);
  });
});

// --- Export filter schemas ---------------------------------------------------

describe("stockFilterSchema", () => {
  it("accepts an empty object — every field is optional", () => {
    expect(stockFilterSchema.parse({})).toEqual({});
  });

  it("parses a fully-specified export query", () => {
    expect(
      stockFilterSchema.parse({
        search: "alpha",
        category: "Grease",
        lowOnly: "true",
      }),
    ).toEqual({ search: "alpha", category: "Grease", lowOnly: "true" });
  });
});

describe("stockMovementFilterSchema", () => {
  it("accepts an empty object — every field is optional", () => {
    expect(stockMovementFilterSchema.parse({})).toEqual({});
  });

  it("parses a fully-specified export query", () => {
    expect(
      stockMovementFilterSchema.parse({
        dateFrom: "2026-06-01",
        dateTo: "2026-06-30",
        kind: "sale",
        location: "warehouse",
        articleNumber: "A-1",
      }),
    ).toEqual({
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
      kind: "sale",
      location: "warehouse",
      articleNumber: "A-1",
    });
  });

  it("rejects a malformed date and an unknown kind/location", () => {
    expect(() =>
      stockMovementFilterSchema.parse({ dateFrom: "06-01-2026" }),
    ).toThrow();
    expect(() => stockMovementFilterSchema.parse({ kind: "bogus" })).toThrow();
    expect(() =>
      stockMovementFilterSchema.parse({ location: "bogus" }),
    ).toThrow();
  });
});
