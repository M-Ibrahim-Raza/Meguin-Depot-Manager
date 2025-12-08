import type { Payment, PaymentReversal } from "@/server/db/schema";

/** Statuses that reserve amount against a payment's remaining reversible balance. */
const RESERVING_STATUSES = new Set(["approved", "pending"]);

/**
 * How much of a payment can still be reversed: the original amount minus every
 * reversal that is `approved` OR still `pending`. Pending requests reserve their
 * amount so a second requester is never told they can reverse more than is truly
 * available — a rejection releases the reservation automatically since a rejected
 * row is excluded from the sum.
 */
export function reversibleRemainingPaisas(
  payment: Pick<Payment, "amountPaisas">,
  existingReversals: Pick<PaymentReversal, "status" | "amountPaisas">[],
): bigint {
  let reserved = 0n;
  for (const r of existingReversals) {
    if (RESERVING_STATUSES.has(r.status)) reserved += r.amountPaisas;
  }
  return payment.amountPaisas - reserved;
}

export type ReversalValidationError =
  | "payment-not-approved"
  | "amount-not-positive"
  | "exceeds-remaining";

export type ValidateReversalResult =
  | { ok: true; remainingAfterPaisas: bigint }
  | { ok: false; error: ReversalValidationError; remainingPaisas: bigint };

/**
 * Validate a requested (or re-checked, at approval time) reversal amount against
 * a payment and its existing reversals. Only an `approved` payment has anything
 * settled to undo; the requested amount must be positive and must not exceed
 * what's still reversible (see `reversibleRemainingPaisas`).
 */
export function validateReversalRequest(
  payment: Pick<Payment, "approval" | "amountPaisas">,
  existingReversals: Pick<PaymentReversal, "status" | "amountPaisas">[],
  requestedAmountPaisas: bigint,
): ValidateReversalResult {
  const remainingPaisas = reversibleRemainingPaisas(payment, existingReversals);

  if (payment.approval !== "approved") {
    return { ok: false, error: "payment-not-approved", remainingPaisas };
  }
  if (requestedAmountPaisas <= 0n) {
    return { ok: false, error: "amount-not-positive", remainingPaisas };
  }
  if (requestedAmountPaisas > remainingPaisas) {
    return { ok: false, error: "exceeds-remaining", remainingPaisas };
  }
  return {
    ok: true,
    remainingAfterPaisas: remainingPaisas - requestedAmountPaisas,
  };
}

/**
 * Sum of `approved` reversal amounts per `paymentId` — what's actually been
 * credited back to the customer so far, used to net the payments ledger's
 * "approved total" and to show "Rs X of Rs Y reversed" on a payment row.
 */
export function sumApprovedReversalsByPayment(
  reversals: Pick<PaymentReversal, "paymentId" | "status" | "amountPaisas">[],
): Map<number, bigint> {
  const map = new Map<number, bigint>();
  for (const r of reversals) {
    if (r.status !== "approved") continue;
    map.set(r.paymentId, (map.get(r.paymentId) ?? 0n) + r.amountPaisas);
  }
  return map;
}

/** Payment ids with a reversal request still awaiting admin review. */
export function paymentIdsWithPendingReversal(
  reversals: Pick<PaymentReversal, "paymentId" | "status">[],
): Set<number> {
  const ids = new Set<number>();
  for (const r of reversals) {
    if (r.status === "pending") ids.add(r.paymentId);
  }
  return ids;
}

/**
 * Group every reversal by its `paymentId`, so a UI iterating a list of
 * payments can look up "this payment's reversals" in O(1) instead of
 * filtering the full reversal list per row.
 */
export function groupReversalsByPayment(
  reversals: PaymentReversal[],
): Map<number, PaymentReversal[]> {
  const map = new Map<number, PaymentReversal[]>();
  for (const r of reversals) {
    const list = map.get(r.paymentId) ?? [];
    list.push(r);
    map.set(r.paymentId, list);
  }
  return map;
}

export type PaymentReversalSummary = {
  reversedApprovedPaisas: bigint;
  hasPendingReversal: boolean;
};

/**
 * Fold one payment's own reversals (as returned by `groupReversalsByPayment`)
 * into the two figures a payment row needs to render — how much has actually
 * been credited back, and whether a request still awaits review.
 */
export function summarizePaymentReversals(
  reversals: Pick<PaymentReversal, "status" | "amountPaisas">[],
): PaymentReversalSummary {
  let reversedApprovedPaisas = 0n;
  let hasPendingReversal = false;
  for (const r of reversals) {
    if (r.status === "approved") reversedApprovedPaisas += r.amountPaisas;
    if (r.status === "pending") hasPendingReversal = true;
  }
  return { reversedApprovedPaisas, hasPendingReversal };
}
