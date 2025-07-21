import { describe, expect, it } from "vitest";
import {
  approvePaymentSchema,
  recordPaymentSchema,
  rejectPaymentSchema,
} from "./schemas";

describe("recordPaymentSchema", () => {
  const valid = {
    customerId: 1,
    date: "2026-05-23",
    amountRupees: 5000,
    method: "cash" as const,
    note: "",
  };

  it("accepts valid input", () => {
    expect(recordPaymentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-positive amount", () => {
    expect(
      recordPaymentSchema.safeParse({ ...valid, amountRupees: 0 }).success,
    ).toBe(false);
    expect(
      recordPaymentSchema.safeParse({ ...valid, amountRupees: -5 }).success,
    ).toBe(false);
  });

  it("rejects unknown method", () => {
    const r = recordPaymentSchema.safeParse({
      ...valid,
      method: "bitcoin" as unknown as "cash",
    });
    expect(r.success).toBe(false);
  });

  it("rejects malformed date", () => {
    expect(
      recordPaymentSchema.safeParse({ ...valid, date: "23-05-2026" }).success,
    ).toBe(false);
  });

  it("rejects non-positive customerId", () => {
    expect(
      recordPaymentSchema.safeParse({ ...valid, customerId: 0 }).success,
    ).toBe(false);
  });
});

describe("approvePaymentSchema", () => {
  it("accepts positive int id", () => {
    expect(approvePaymentSchema.safeParse({ id: 1 }).success).toBe(true);
  });
  it("rejects zero and negative ids", () => {
    expect(approvePaymentSchema.safeParse({ id: 0 }).success).toBe(false);
    expect(approvePaymentSchema.safeParse({ id: -1 }).success).toBe(false);
  });
  it("accepts an omitted remark", () => {
    expect(approvePaymentSchema.safeParse({ id: 1 }).success).toBe(true);
  });
  it("accepts a remark within bounds", () => {
    const r = approvePaymentSchema.safeParse({ id: 1, remark: "Looks good" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.remark).toBe("Looks good");
    }
  });
  it("rejects a remark over 500 characters", () => {
    const r = approvePaymentSchema.safeParse({
      id: 1,
      remark: "a".repeat(501),
    });
    expect(r.success).toBe(false);
  });
});

describe("rejectPaymentSchema", () => {
  it("accepts id + 3+ char reason", () => {
    const r = rejectPaymentSchema.safeParse({ id: 1, reason: "Bank mismatch" });
    expect(r.success).toBe(true);
  });

  it("rejects missing reason", () => {
    const r = rejectPaymentSchema.safeParse({ id: 1, reason: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["reason"]);
    }
  });

  it("rejects 1-2 char reason", () => {
    expect(rejectPaymentSchema.safeParse({ id: 1, reason: "no" }).success).toBe(
      false,
    );
  });

  it("trims whitespace", () => {
    const r = rejectPaymentSchema.safeParse({
      id: 1,
      reason: "  Bank mismatch  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.reason).toBe("Bank mismatch");
    }
  });

  it("accepts an omitted remark", () => {
    expect(
      rejectPaymentSchema.safeParse({ id: 1, reason: "Bank mismatch" }).success,
    ).toBe(true);
  });

  it("accepts a remark within bounds", () => {
    const r = rejectPaymentSchema.safeParse({
      id: 1,
      reason: "Bank mismatch",
      remark: "Customer notified by phone",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.remark).toBe("Customer notified by phone");
    }
  });

  it("rejects a remark over 500 characters", () => {
    const r = rejectPaymentSchema.safeParse({
      id: 1,
      reason: "Bank mismatch",
      remark: "a".repeat(501),
    });
    expect(r.success).toBe(false);
  });
});
