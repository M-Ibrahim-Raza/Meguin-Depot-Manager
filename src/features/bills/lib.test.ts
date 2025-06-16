import { describe, expect, it } from "vitest";
import type { BillWithCustomer } from "@/server/db/repos/bills.repo";
import type { BillLineInput } from "./schemas";
import {
  calculateBillTotal,
  calculateBillUpsellPaisas,
  computeBillStatus,
  filterBills,
  findDuplicateLine,
  getBillCopyTitles,
  resolveLineUnitPricePaisas,
  RETURN_COPY_TITLES,
  SALE_COPY_TITLES,
  validateUpsellPrices,
} from "./lib";

function bill(over: Partial<BillWithCustomer>): BillWithCustomer {
  return {
    id: 1,
    billNo: "B-1001",
    customerId: 1,
    date: "2026-06-15",
    direction: "sale",
    type: "cash",
    status: "paid",
    note: null,
    amountPaisas: 1000n,
    createdBy: null,
    createdAt: new Date("2026-06-15"),
    approvedBy: null,
    approvedAt: null,
    rejectReason: null,
    customerName: "Ali Traders",
    customerArea: null,
    ...over,
  } as BillWithCustomer;
}

const rows = [
  bill({
    id: 1,
    billNo: "B-1001",
    date: "2026-06-01",
    status: "paid",
    direction: "sale",
    customerId: 1,
  }),
  bill({
    id: 2,
    billNo: "B-1002",
    date: "2026-06-15",
    status: "unpaid",
    direction: "sale",
    customerId: 2,
    customerName: "Noor",
  }),
  bill({
    id: 3,
    billNo: "R-200",
    date: "2026-06-30",
    status: "paid",
    direction: "return",
    customerId: 1,
  }),
];

describe("filterBills", () => {
  it("filters by status and direction", () => {
    expect(filterBills(rows, { status: "unpaid" }).map((b) => b.id)).toEqual([
      2,
    ]);
    expect(filterBills(rows, { direction: "return" }).map((b) => b.id)).toEqual(
      [3],
    );
  });

  it("filters by customerId", () => {
    expect(filterBills(rows, { customerId: "1" }).map((b) => b.id)).toEqual([
      1, 3,
    ]);
  });

  it("applies an inclusive date range", () => {
    expect(
      filterBills(rows, { dateFrom: "2026-06-10", dateTo: "2026-06-20" }).map(
        (b) => b.id,
      ),
    ).toEqual([2]);
  });

  it("searches customer name, bill number, and note", () => {
    expect(filterBills(rows, { search: "noor" }).map((b) => b.id)).toEqual([2]);
    expect(filterBills(rows, { search: "R-200" }).map((b) => b.id)).toEqual([
      3,
    ]);
  });
});

/** Build a bill line; qty defaults to 1, location to warehouse, no upsell. */
function line(over: Partial<BillLineInput> = {}): BillLineInput {
  return {
    articleNumber: "A1",
    location: "warehouse",
    qty: 1,
    salePriceRupees: 0,
    ...over,
  };
}

/** A product price map keyed by article number, as both the router and form build. */
const prices = new Map<string, { pricePaisas: bigint }>([
  ["A1", { pricePaisas: 10_000n }], // Rs. 100
  ["A2", { pricePaisas: 25_050n }], // Rs. 250.50
]);

describe("calculateBillTotal", () => {
  it("sums lineTotalPaisas over multiple items", () => {
    const total = calculateBillTotal(
      [
        line({ articleNumber: "A1", qty: 2 }), // 20_000
        line({ articleNumber: "A2", qty: 1 }), // 25_050
      ],
      prices,
    );
    expect(total).toBe(45_050n);
  });

  it("handles fractional quantities by rounding each line (matches lineTotalPaisas)", () => {
    // 2.5 × 10_000 = 25_000 ; 0.333 × 25_050 = 8341.65 → rounds to 8342
    const total = calculateBillTotal(
      [
        line({ articleNumber: "A1", qty: 2.5 }),
        line({ articleNumber: "A2", qty: 0.333 }),
      ],
      prices,
    );
    expect(total).toBe(33_342n);
  });

  it("returns 0n for no items", () => {
    expect(calculateBillTotal([], prices)).toBe(0n);
  });

  it("skips lines whose product is missing from the price map", () => {
    const total = calculateBillTotal(
      [line({ articleNumber: "A1", qty: 1 }), line({ articleNumber: "GONE" })],
      prices,
    );
    expect(total).toBe(10_000n);
  });

  it("uses the upsold price for a line with salePriceRupees set", () => {
    // A1 listed at Rs. 100; sold at Rs. 120 × qty 2 = 24_000 paisas.
    const total = calculateBillTotal(
      [line({ articleNumber: "A1", qty: 2, salePriceRupees: 120 })],
      prices,
    );
    expect(total).toBe(24_000n);
  });
});

describe("resolveLineUnitPricePaisas", () => {
  const product = { pricePaisas: 10_000n }; // Rs. 100

  it("falls back to the catalogue price when salePriceRupees is 0", () => {
    expect(resolveLineUnitPricePaisas({ salePriceRupees: 0 }, product)).toBe(
      10_000n,
    );
  });

  it("uses the override price when salePriceRupees is set", () => {
    expect(resolveLineUnitPricePaisas({ salePriceRupees: 150 }, product)).toBe(
      15_000n,
    );
  });
});

describe("validateUpsellPrices", () => {
  it("flags a line whose entered price undercuts the catalogue price", () => {
    const issues = validateUpsellPrices(
      [line({ articleNumber: "A1", salePriceRupees: 50 })], // Rs. 50 < Rs. 100
      prices,
    );
    expect(issues).toEqual([
      {
        articleNumber: "A1",
        location: "warehouse",
        listedPaisas: 10_000n,
        enteredPaisas: 5_000n,
      },
    ]);
  });

  it("allows a price equal to or above the catalogue price", () => {
    expect(
      validateUpsellPrices(
        [
          line({ articleNumber: "A1", salePriceRupees: 100 }),
          line({ articleNumber: "A2", salePriceRupees: 300 }),
        ],
        prices,
      ),
    ).toEqual([]);
  });

  it("ignores lines with no override (salePriceRupees 0)", () => {
    expect(
      validateUpsellPrices([line({ articleNumber: "A1" })], prices),
    ).toEqual([]);
  });

  it("skips lines whose product is missing from the price map", () => {
    expect(
      validateUpsellPrices(
        [line({ articleNumber: "GONE", salePriceRupees: 1 })],
        prices,
      ),
    ).toEqual([]);
  });

  it("flags multiple offending lines", () => {
    const issues = validateUpsellPrices(
      [
        line({
          articleNumber: "A1",
          location: "warehouse",
          salePriceRupees: 50,
        }),
        line({ articleNumber: "A2", location: "office", salePriceRupees: 1 }),
      ],
      prices,
    );
    expect(issues.map((i) => i.articleNumber)).toEqual(["A1", "A2"]);
  });
});

describe("calculateBillUpsellPaisas", () => {
  it("returns 0 for a bill with no upsold lines", () => {
    expect(
      calculateBillUpsellPaisas(
        [line({ articleNumber: "A1", qty: 3 })],
        prices,
      ),
    ).toBe(0n);
  });

  it("sums the per-line extra revenue from upsold lines only", () => {
    // A1: listed 100, sold 120, qty 2 → +40 → 4_000 paisas.
    // A2: listed 250.50, not upsold → +0.
    const total = calculateBillUpsellPaisas(
      [
        line({ articleNumber: "A1", qty: 2, salePriceRupees: 120 }),
        line({ articleNumber: "A2", qty: 1 }),
      ],
      prices,
    );
    expect(total).toBe(4_000n);
  });
});

describe("computeBillStatus", () => {
  it("cash bill is paid with no outstanding change and not over-limit", () => {
    expect(
      computeBillStatus({
        type: "cash",
        totalPaisas: 50_000n,
        outstandingPaisas: 0n,
        creditLimitPaisas: 10_000n,
        isAdmin: false,
      }),
    ).toEqual({
      status: "paid",
      outstandingDeltaPaisas: 0n,
      overLimit: false,
    });
  });

  it("deferred under the limit is unpaid with the full total as delta", () => {
    expect(
      computeBillStatus({
        type: "deferred",
        totalPaisas: 30_000n,
        outstandingPaisas: 10_000n,
        creditLimitPaisas: 100_000n,
        isAdmin: false,
      }),
    ).toEqual({
      status: "unpaid",
      outstandingDeltaPaisas: 30_000n,
      overLimit: false,
    });
  });

  it("deferred projected exactly equal to the limit is NOT over-limit", () => {
    expect(
      computeBillStatus({
        type: "deferred",
        totalPaisas: 40_000n,
        outstandingPaisas: 60_000n,
        creditLimitPaisas: 100_000n, // 60_000 + 40_000 === 100_000
        isAdmin: false,
      }),
    ).toEqual({
      status: "unpaid",
      outstandingDeltaPaisas: 40_000n,
      overLimit: false,
    });
  });

  it("deferred over the limit as admin is unpaid with full delta and over-limit", () => {
    expect(
      computeBillStatus({
        type: "deferred",
        totalPaisas: 50_001n,
        outstandingPaisas: 60_000n,
        creditLimitPaisas: 100_000n, // projected 110_001 > limit
        isAdmin: true,
      }),
    ).toEqual({
      status: "unpaid",
      outstandingDeltaPaisas: 50_001n,
      overLimit: true,
    });
  });

  it("deferred over the limit as user is pending_approval with no delta and over-limit", () => {
    expect(
      computeBillStatus({
        type: "deferred",
        totalPaisas: 50_001n,
        outstandingPaisas: 60_000n,
        creditLimitPaisas: 100_000n,
        isAdmin: false,
      }),
    ).toEqual({
      status: "pending_approval",
      outstandingDeltaPaisas: 0n,
      overLimit: true,
    });
  });
});

describe("getBillCopyTitles", () => {
  it("returns the sale copy titles for a sale bill", () => {
    expect(getBillCopyTitles("sale")).toEqual(SALE_COPY_TITLES);
  });

  it("returns the return copy titles for a return bill", () => {
    expect(getBillCopyTitles("return")).toEqual(RETURN_COPY_TITLES);
  });

  it("falls back to sale copy titles for any other direction", () => {
    expect(getBillCopyTitles("something-else")).toEqual(SALE_COPY_TITLES);
  });
});

describe("findDuplicateLine", () => {
  it("returns the first duplicate (article, location) key", () => {
    expect(
      findDuplicateLine([
        line({ articleNumber: "A1", location: "warehouse" }),
        line({ articleNumber: "A1", location: "office" }), // same article, diff location — OK
        line({ articleNumber: "A1", location: "warehouse" }), // duplicate of the first
      ]),
    ).toBe("A1::warehouse");
  });

  it("returns null when every (article, location) pair is unique", () => {
    expect(
      findDuplicateLine([
        line({ articleNumber: "A1", location: "warehouse" }),
        line({ articleNumber: "A1", location: "office" }),
        line({ articleNumber: "A2", location: "warehouse" }),
      ]),
    ).toBeNull();
  });
});
