import { describe, expect, it } from "vitest";
import type { Payment, PaymentReversal } from "@/server/db/schema";
import {
  groupReversalsByPayment,
  paymentIdsWithPendingReversal,
  reversibleRemainingPaisas,
  summarizePaymentReversals,
  sumApprovedReversalsByPayment,
  validateReversalRequest,
} from "./lib";

function payment(
  over: Partial<Payment> = {},
): Pick<Payment, "approval" | "amountPaisas"> {
  return { approval: "approved", amountPaisas: 10_000n, ...over };
}

function reversal(
  over: Partial<PaymentReversal> = {},
): Pick<PaymentReversal, "paymentId" | "status" | "amountPaisas"> {
  return { paymentId: 1, status: "approved", amountPaisas: 1000n, ...over };
}

describe("reversibleRemainingPaisas", () => {
  it("is the full amount with no reversals", () => {
    expect(reversibleRemainingPaisas(payment(), [])).toBe(10_000n);
  });

  it("subtracts approved and pending reversals", () => {
    const remaining = reversibleRemainingPaisas(payment(), [
      reversal({ status: "approved", amountPaisas: 3000n }),
      reversal({ status: "pending", amountPaisas: 2000n }),
    ]);
    expect(remaining).toBe(5000n);
  });

  it("ignores rejected reversals (their reservation is released)", () => {
    const remaining = reversibleRemainingPaisas(payment(), [
      reversal({ status: "rejected", amountPaisas: 9000n }),
    ]);
    expect(remaining).toBe(10_000n);
  });
});

describe("validateReversalRequest", () => {
  it("accepts a full reversal of an approved payment with no prior reversals", () => {
    const result = validateReversalRequest(payment(), [], 10_000n);
    expect(result).toEqual({ ok: true, remainingAfterPaisas: 0n });
  });

  it("accepts two partials that sum exactly to the total", () => {
    const first = validateReversalRequest(payment(), [], 6000n);
    expect(first).toEqual({ ok: true, remainingAfterPaisas: 4000n });

    const second = validateReversalRequest(
      payment(),
      [reversal({ status: "approved", amountPaisas: 6000n })],
      4000n,
    );
    expect(second).toEqual({ ok: true, remainingAfterPaisas: 0n });
  });

  it("rejects a third partial that exceeds the remaining amount by 1 paisa", () => {
    const result = validateReversalRequest(
      payment(),
      [reversal({ status: "approved", amountPaisas: 6000n })],
      4001n,
    );
    expect(result).toEqual({
      ok: false,
      error: "exceeds-remaining",
      remainingPaisas: 4000n,
    });
  });

  it("rejects a request that exceeds the remaining amount reserved by a pending reversal", () => {
    const result = validateReversalRequest(
      payment(),
      [reversal({ status: "pending", amountPaisas: 8000n })],
      3000n,
    );
    expect(result).toEqual({
      ok: false,
      error: "exceeds-remaining",
      remainingPaisas: 2000n,
    });
  });

  it("allows a request whose remaining was freed by a rejected reversal", () => {
    const result = validateReversalRequest(
      payment(),
      [reversal({ status: "rejected", amountPaisas: 8000n })],
      9000n,
    );
    expect(result).toEqual({ ok: true, remainingAfterPaisas: 1000n });
  });

  it("rejects a zero amount", () => {
    const result = validateReversalRequest(payment(), [], 0n);
    expect(result).toEqual({
      ok: false,
      error: "amount-not-positive",
      remainingPaisas: 10_000n,
    });
  });

  it("rejects a negative amount", () => {
    const result = validateReversalRequest(payment(), [], -500n);
    expect(result).toEqual({
      ok: false,
      error: "amount-not-positive",
      remainingPaisas: 10_000n,
    });
  });

  it("rejects a request against a pending payment", () => {
    const result = validateReversalRequest(
      payment({ approval: "pending" }),
      [],
      1000n,
    );
    expect(result).toEqual({
      ok: false,
      error: "payment-not-approved",
      remainingPaisas: 10_000n,
    });
  });

  it("rejects a request against a rejected payment", () => {
    const result = validateReversalRequest(
      payment({ approval: "rejected" }),
      [],
      1000n,
    );
    expect(result).toEqual({
      ok: false,
      error: "payment-not-approved",
      remainingPaisas: 10_000n,
    });
  });
});

describe("sumApprovedReversalsByPayment", () => {
  it("sums only approved reversals, grouped by paymentId", () => {
    const map = sumApprovedReversalsByPayment([
      reversal({ paymentId: 1, status: "approved", amountPaisas: 1000n }),
      reversal({ paymentId: 1, status: "approved", amountPaisas: 2000n }),
      reversal({ paymentId: 1, status: "pending", amountPaisas: 500n }),
      reversal({ paymentId: 2, status: "rejected", amountPaisas: 9000n }),
    ]);
    expect(map.get(1)).toBe(3000n);
    expect(map.has(2)).toBe(false);
  });

  it("returns an empty map for no reversals", () => {
    expect(sumApprovedReversalsByPayment([]).size).toBe(0);
  });
});

describe("paymentIdsWithPendingReversal", () => {
  it("collects payment ids with a pending request, ignoring other statuses", () => {
    const ids = paymentIdsWithPendingReversal([
      reversal({ paymentId: 1, status: "pending" }),
      reversal({ paymentId: 2, status: "approved" }),
      reversal({ paymentId: 3, status: "rejected" }),
    ]);
    expect(ids).toEqual(new Set([1]));
  });
});

function fullReversal(over: Partial<PaymentReversal> = {}): PaymentReversal {
  return {
    id: 1,
    reversalNo: "RV-1",
    paymentId: 1,
    customerId: 1,
    amountPaisas: 1000n,
    status: "pending",
    reason: "Overpaid by mistake",
    requestedBy: null,
    requestedAt: new Date("2026-06-15"),
    approvedBy: null,
    approvedAt: null,
    rejectReason: null,
    ...over,
  };
}

describe("summarizePaymentReversals", () => {
  it("sums approved amounts and flags a pending request", () => {
    const summary = summarizePaymentReversals([
      reversal({ status: "approved", amountPaisas: 1000n }),
      reversal({ status: "approved", amountPaisas: 500n }),
      reversal({ status: "pending", amountPaisas: 200n }),
    ]);
    expect(summary).toEqual({
      reversedApprovedPaisas: 1500n,
      hasPendingReversal: true,
    });
  });

  it("returns zero/false for no reversals", () => {
    expect(summarizePaymentReversals([])).toEqual({
      reversedApprovedPaisas: 0n,
      hasPendingReversal: false,
    });
  });

  it("ignores rejected reversals entirely", () => {
    expect(
      summarizePaymentReversals([
        reversal({ status: "rejected", amountPaisas: 9000n }),
      ]),
    ).toEqual({ reversedApprovedPaisas: 0n, hasPendingReversal: false });
  });
});

describe("groupReversalsByPayment", () => {
  it("groups reversals by paymentId, preserving each payment's own list", () => {
    const map = groupReversalsByPayment([
      fullReversal({ id: 1, paymentId: 1 }),
      fullReversal({ id: 2, paymentId: 2 }),
      fullReversal({ id: 3, paymentId: 1 }),
    ]);
    expect(map.get(1)?.map((r) => r.id)).toEqual([1, 3]);
    expect(map.get(2)?.map((r) => r.id)).toEqual([2]);
    expect(map.has(3)).toBe(false);
  });
});
