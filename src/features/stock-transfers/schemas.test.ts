import { describe, expect, it } from "vitest";
import { createTransferSchema } from "./schemas";

const base = {
  fromLocation: "warehouse" as const,
  toLocation: "office" as const,
  date: "2026-06-21",
  items: [{ articleNumber: "MEG-20W50-208", qty: 2 }],
};

describe("createTransferSchema", () => {
  it("accepts a valid warehouse → office transfer", () => {
    const r = createTransferSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rejects when source and destination are the same", () => {
    const r = createTransferSchema.safeParse({
      ...base,
      toLocation: "warehouse",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("toLocation"))).toBe(
        true,
      );
    }
  });

  it("requires at least one item", () => {
    const r = createTransferSchema.safeParse({ ...base, items: [] });
    expect(r.success).toBe(false);
  });

  it("rejects a non-positive quantity", () => {
    const r = createTransferSchema.safeParse({
      ...base,
      items: [{ articleNumber: "X", qty: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects a bad date format", () => {
    const r = createTransferSchema.safeParse({ ...base, date: "21-06-2026" });
    expect(r.success).toBe(false);
  });
});
