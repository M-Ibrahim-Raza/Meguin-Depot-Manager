import { describe, expect, it } from "vitest";
import { createCustomerSchema, updateCustomerSchema } from "./schemas";

const validBase = {
  name: "Ali Traders",
  creditLimitRupees: 10_000,
};

describe("createCustomerSchema", () => {
  it("defaults initialOutstandingRupees to 0 when omitted", () => {
    const r = createCustomerSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.initialOutstandingRupees).toBe(0);
    }
  });

  it("accepts initialOutstandingRupees equal to the credit limit", () => {
    const r = createCustomerSchema.safeParse({
      ...validBase,
      initialOutstandingRupees: 10_000,
    });
    expect(r.success).toBe(true);
  });

  it("rejects initialOutstandingRupees greater than the credit limit", () => {
    const r = createCustomerSchema.safeParse({
      ...validBase,
      initialOutstandingRupees: 10_001,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["initialOutstandingRupees"]);
    }
  });

  it("rejects a negative initialOutstandingRupees", () => {
    const r = createCustomerSchema.safeParse({
      ...validBase,
      initialOutstandingRupees: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe("updateCustomerSchema", () => {
  it("has no initialOutstandingRupees field, so a lower credit limit never fails on it", () => {
    const r = updateCustomerSchema.safeParse({
      ...validBase,
      id: 1,
      creditLimitRupees: 0,
      initialOutstandingRupees: 999_999,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("initialOutstandingRupees");
    }
  });
});
