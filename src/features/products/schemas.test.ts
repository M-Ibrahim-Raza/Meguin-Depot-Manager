import { describe, expect, it } from "vitest";
import { createProductSchema } from "./schemas";

describe("createProductSchema", () => {
  it("accepts valid input", () => {
    const result = createProductSchema.safeParse({
      articleNumber: "MEG-20W50-208",
      name: "Meguin 20W50",
      unit: "Drum (208L)",
      category: "Engine Oil",
      priceRupees: 125000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createProductSchema.safeParse({
      articleNumber: "MEG-20W50-208",
      name: "",
      unit: "Drum (208L)",
      category: "Engine Oil",
      priceRupees: 125000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["name"]);
    }
  });

  it("rejects empty article number", () => {
    const result = createProductSchema.safeParse({
      articleNumber: "",
      name: "Meguin 20W50",
      unit: "Drum (208L)",
      category: "Engine Oil",
      priceRupees: 125000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["articleNumber"]);
    }
  });

  it("rejects article numbers with invalid characters", () => {
    const result = createProductSchema.safeParse({
      articleNumber: "MEG 20W50/208",
      name: "Meguin 20W50",
      unit: "Drum (208L)",
      category: "Engine Oil",
      priceRupees: 125000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["articleNumber"]);
    }
  });

  it("rejects zero or negative price", () => {
    const zero = createProductSchema.safeParse({
      articleNumber: "MEG-X",
      name: "X",
      unit: "Y",
      category: "Engine Oil",
      priceRupees: 0,
    });
    const neg = createProductSchema.safeParse({
      articleNumber: "MEG-X",
      name: "X",
      unit: "Y",
      category: "Engine Oil",
      priceRupees: -5,
    });
    expect(zero.success).toBe(false);
    expect(neg.success).toBe(false);
  });

  // Categories are managed in the DB (categories table + categoriesRouter), not a
  // fixed enum, so the schema accepts any non-empty category string. Whether the
  // category actually exists is enforced server-side in the products router
  // (UNKNOWN_CATEGORY_ERROR via categoryExists), not at this validation layer.
  it("accepts any non-empty category (existence is enforced server-side)", () => {
    const result = createProductSchema.safeParse({
      articleNumber: "MEG-X",
      name: "X",
      unit: "Y",
      category: "Some New Category",
      priceRupees: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty category", () => {
    const result = createProductSchema.safeParse({
      articleNumber: "MEG-X",
      name: "X",
      unit: "Y",
      category: "",
      priceRupees: 100,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["category"]);
    }
  });

  it("trims whitespace on name and unit", () => {
    const result = createProductSchema.safeParse({
      articleNumber: "MEG-20W50-208",
      name: "  Meguin  ",
      unit: "  Drum  ",
      category: "Engine Oil",
      priceRupees: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Meguin");
      expect(result.data.unit).toBe("Drum");
    }
  });
});
