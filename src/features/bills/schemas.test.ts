import { describe, expect, it } from "vitest";
import { createBillSchema } from "./schemas";

const validBase = {
  customerId: 1,
  date: "2026-05-23",
  type: "deferred" as const,
  note: "",
  items: [
    { articleNumber: "MEG-20W50-208", location: "warehouse" as const, qty: 2 },
  ],
};

describe("createBillSchema", () => {
  it("accepts a valid deferred bill with one line", () => {
    expect(createBillSchema.safeParse(validBase).success).toBe(true);
  });

  it("accepts a cash bill", () => {
    const r = createBillSchema.safeParse({ ...validBase, type: "cash" });
    expect(r.success).toBe(true);
  });

  it("rejects when items is empty", () => {
    const r = createBillSchema.safeParse({ ...validBase, items: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["items"]);
    }
  });

  it("rejects qty <= 0", () => {
    const zero = createBillSchema.safeParse({
      ...validBase,
      items: [
        { articleNumber: "MEG-20W50-208", location: "warehouse", qty: 0 },
      ],
    });
    const neg = createBillSchema.safeParse({
      ...validBase,
      items: [
        { articleNumber: "MEG-20W50-208", location: "warehouse", qty: -1 },
      ],
    });
    expect(zero.success).toBe(false);
    expect(neg.success).toBe(false);
  });

  it("rejects non-positive customerId", () => {
    const r = createBillSchema.safeParse({ ...validBase, customerId: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects unknown bill type", () => {
    const r = createBillSchema.safeParse({
      ...validBase,
      type: "mixed" as unknown as "cash",
    });
    expect(r.success).toBe(false);
  });

  it("rejects malformed date", () => {
    const r = createBillSchema.safeParse({ ...validBase, date: "23/05/2026" });
    expect(r.success).toBe(false);
  });

  it("defaults note to empty string when omitted", () => {
    const { note: _omit, ...without } = validBase;
    void _omit;
    const r = createBillSchema.safeParse(without);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.note).toBe("");
    }
  });

  it("defaults salePriceRupees to 0 when omitted", () => {
    const r = createBillSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.items[0].salePriceRupees).toBe(0);
    }
  });

  it("accepts a positive integer salePriceRupees", () => {
    const r = createBillSchema.safeParse({
      ...validBase,
      items: [
        {
          articleNumber: "MEG-20W50-208",
          location: "warehouse",
          qty: 2,
          salePriceRupees: 500,
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects a negative salePriceRupees", () => {
    const r = createBillSchema.safeParse({
      ...validBase,
      items: [
        {
          articleNumber: "MEG-20W50-208",
          location: "warehouse",
          qty: 2,
          salePriceRupees: -1,
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("rejects a salePriceRupees over the sanity bound", () => {
    const r = createBillSchema.safeParse({
      ...validBase,
      items: [
        {
          articleNumber: "MEG-20W50-208",
          location: "warehouse",
          qty: 2,
          salePriceRupees: 100_000_001,
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});
