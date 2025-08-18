import { describe, expect, it } from "vitest";
import type { ReturnableProduct } from "@/server/db/repos/returns.repo";
import type { ReturnLineInput } from "./schemas";
import {
  calculateReturnTotal,
  computeReturnBillStatus,
  createReturnLineSnapshot,
  validateReturnItems,
} from "./lib";

/** Build a returnable-pool row, overriding only the fields a test cares about. */
function returnable(over: Partial<ReturnableProduct> = {}): ReturnableProduct {
  return {
    articleNumber: "A-100",
    name: "Meguin 5W-30",
    unit: "L",
    category: "Engine Oil",
    returnableQty: 10,
    latestUnitPricePaisas: 50_000n, // Rs 500.00
    ...over,
  };
}

/** Map keyed by articleNumber, as both call sites build it. */
function poolOf(...rows: ReturnableProduct[]) {
  return new Map(rows.map((r) => [r.articleNumber, r]));
}

function line(articleNumber: string, qty: number): ReturnLineInput {
  return { articleNumber, qty };
}

describe("validateReturnItems", () => {
  it("validates a multi-line return, totalling and snapshotting each line", () => {
    const pool = poolOf(
      returnable({ articleNumber: "A-1", latestUnitPricePaisas: 50_000n }),
      returnable({
        articleNumber: "A-2",
        name: "Meguin 10W-40",
        unit: "pcs",
        latestUnitPricePaisas: 12_000n,
      }),
    );
    const result = validateReturnItems([line("A-1", 2), line("A-2", 3)], pool);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 2 × 50_000 + 3 × 12_000 = 100_000 + 36_000
    expect(result.amountPaisas).toBe(136_000n);
    expect(result.items).toEqual([
      {
        articleNumber: "A-1",
        nameSnapshot: "Meguin 5W-30",
        unitSnapshot: "L",
        unitPricePaisas: 50_000n,
        basePricePaisas: 50_000n,
        qty: "2",
      },
      {
        articleNumber: "A-2",
        nameSnapshot: "Meguin 10W-40",
        unitSnapshot: "pcs",
        unitPricePaisas: 12_000n,
        basePricePaisas: 12_000n,
        qty: "3",
      },
    ]);
  });

  it("rejects a line whose article is not in the returnable pool", () => {
    const pool = poolOf(returnable({ articleNumber: "A-1" }));
    const result = validateReturnItems([line("A-9", 1)], pool);

    expect(result).toEqual({
      ok: false,
      error: "not-returnable",
      articleNumber: "A-9",
    });
  });

  it("rejects a duplicate article line", () => {
    const pool = poolOf(
      returnable({ articleNumber: "A-1", returnableQty: 10 }),
    );
    const result = validateReturnItems([line("A-1", 1), line("A-1", 2)], pool);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("duplicate");
    expect(result.articleNumber).toBe("A-1");
  });

  it("rejects a line whose qty exceeds the returnable cap", () => {
    const pool = poolOf(
      returnable({
        articleNumber: "A-1",
        name: "Meguin 5W-30",
        returnableQty: 5,
      }),
    );
    const result = validateReturnItems([line("A-1", 6)], pool);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("over-cap");
    expect(result.articleNumber).toBe("A-1");
  });

  it("accepts a line whose qty exactly equals the cap", () => {
    const pool = poolOf(
      returnable({
        articleNumber: "A-1",
        returnableQty: 5,
        latestUnitPricePaisas: 50_000n,
      }),
    );
    const result = validateReturnItems([line("A-1", 5)], pool);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amountPaisas).toBe(250_000n);
    expect(result.items[0]?.qty).toBe("5");
  });

  it("prices a fractional qty with banker-free rounding (Math.round)", () => {
    // 0.005 L × Rs 333.33 (33_333 paisas) = 166.665 paisas → rounds to 167
    const pool = poolOf(
      returnable({
        articleNumber: "A-1",
        returnableQty: 1,
        latestUnitPricePaisas: 33_333n,
      }),
    );
    const result = validateReturnItems([line("A-1", 0.005)], pool);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.amountPaisas).toBe(167n);
    expect(result.items[0]?.qty).toBe("0.005");
  });

  it("checks not-returnable before duplicate before over-cap", () => {
    // A duplicate of an unknown article must surface as not-returnable, since the
    // not-returnable check runs first against the pool.
    const pool = poolOf(returnable({ articleNumber: "A-1" }));
    const result = validateReturnItems([line("A-9", 1), line("A-9", 1)], pool);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("not-returnable");
  });
});

describe("createReturnLineSnapshot", () => {
  it("builds the snapshot row with qty stored as a string", () => {
    const r = returnable({
      articleNumber: "A-7",
      name: "Meguin 5W-40",
      unit: "L",
      latestUnitPricePaisas: 42_000n,
    });
    expect(createReturnLineSnapshot(r, 2.5)).toEqual({
      articleNumber: "A-7",
      nameSnapshot: "Meguin 5W-40",
      unitSnapshot: "L",
      unitPricePaisas: 42_000n,
      basePricePaisas: 42_000n,
      qty: "2.5",
    });
  });
});

describe("calculateReturnTotal", () => {
  it("sums priced lines across the pool", () => {
    const pool = poolOf(
      returnable({ articleNumber: "A-1", latestUnitPricePaisas: 50_000n }),
      returnable({ articleNumber: "A-2", latestUnitPricePaisas: 12_000n }),
    );
    expect(calculateReturnTotal([line("A-1", 2), line("A-2", 3)], pool)).toBe(
      136_000n,
    );
  });

  it("skips lines absent from the pool", () => {
    const pool = poolOf(
      returnable({ articleNumber: "A-1", latestUnitPricePaisas: 50_000n }),
    );
    expect(calculateReturnTotal([line("A-1", 1), line("A-9", 9)], pool)).toBe(
      50_000n,
    );
  });
});

describe("computeReturnBillStatus", () => {
  it("settles immediately for an admin", () => {
    expect(computeReturnBillStatus(true)).toBe("paid");
  });

  it("needs admin approval for a non-admin", () => {
    expect(computeReturnBillStatus(false)).toBe("pending_approval");
  });
});
