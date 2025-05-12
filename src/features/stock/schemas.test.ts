import { describe, expect, it } from "vitest";
import {
  addStockSchema,
  adjustStockSchema,
  setOpeningSchema,
  setReorderLevelSchema,
} from "./schemas";

describe("setOpeningSchema", () => {
  it("accepts zero (a valid opening baseline)", () => {
    expect(
      setOpeningSchema.safeParse({
        articleNumber: "A-1",
        location: "warehouse",
        qty: 0,
      }).success,
    ).toBe(true);
  });

  it("rejects negative quantities", () => {
    expect(
      setOpeningSchema.safeParse({
        articleNumber: "A-1",
        location: "warehouse",
        qty: -1,
      }).success,
    ).toBe(false);
  });

  it("requires a location", () => {
    expect(
      setOpeningSchema.safeParse({ articleNumber: "A-1", qty: 0 }).success,
    ).toBe(false);
  });
});

describe("addStockSchema", () => {
  it("accepts a positive quantity with an optional note", () => {
    expect(
      addStockSchema.safeParse({
        articleNumber: "A-1",
        location: "office",
        qty: 5,
        note: "restock",
      }).success,
    ).toBe(true);
  });

  it("rejects zero (nothing to add)", () => {
    expect(
      addStockSchema.safeParse({
        articleNumber: "A-1",
        location: "warehouse",
        qty: 0,
      }).success,
    ).toBe(false);
  });
});

describe("adjustStockSchema", () => {
  it("requires a reason note", () => {
    expect(
      adjustStockSchema.safeParse({
        articleNumber: "A-1",
        location: "warehouse",
        counted: 3,
      }).success,
    ).toBe(false);
    expect(
      adjustStockSchema.safeParse({
        articleNumber: "A-1",
        location: "warehouse",
        counted: 3,
        note: "recount",
      }).success,
    ).toBe(true);
  });
});

describe("setReorderLevelSchema", () => {
  it("accepts a number or null (to clear)", () => {
    expect(
      setReorderLevelSchema.safeParse({
        articleNumber: "A-1",
        reorderLevel: 10,
      }).success,
    ).toBe(true);
    expect(
      setReorderLevelSchema.safeParse({
        articleNumber: "A-1",
        reorderLevel: null,
      }).success,
    ).toBe(true);
  });
});
