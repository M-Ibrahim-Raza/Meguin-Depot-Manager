import { z } from "zod";
import { APPROVAL_STATUS_LABELS, type ApprovalStatus } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";
import type { Payment } from "@/server/db/schema";

/** Payment ledger/export filters. All optional; "all"/empty means no constraint. */
export const paymentFilterSchema = z.object({
  search: z.string().optional(),
  approval: z.string().optional(),
  method: z.string().optional(),
  customerId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
export type PaymentFilters = z.infer<typeof paymentFilterSchema>;

/**
 * Shared payment filter predicate — used by both the Payments ledger page and
 * the export route so the exported rows match exactly what is on screen.
 */
export function filterPayments(
  rows: PaymentWithCustomer[],
  f: PaymentFilters,
): PaymentWithCustomer[] {
  const q = (f.search ?? "").trim().toLowerCase();
  const approval = f.approval ?? "all";
  const method = f.method ?? "all";
  const customerId = f.customerId ?? "all";
  const dateFrom = f.dateFrom ?? "";
  const dateTo = f.dateTo ?? "";
  return rows.filter((p) => {
    if (approval !== "all" && p.approval !== approval) return false;
    if (method !== "all" && p.method !== method) return false;
    if (customerId !== "all" && String(p.customerId) !== customerId)
      return false;
    if (dateFrom && p.date < dateFrom) return false;
    if (dateTo && p.date > dateTo) return false;
    if (q) {
      const hay = `${p.customerName} ${p.payId} ${p.note ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Group payments into date buckets, newest date first. Mirrors the Payments
 * ledger: keyed by the `date` string, sorted descending by date, and the
 * payments within each bucket keep their incoming order (caller pre-sorts).
 */
export function groupPaymentsByDate(
  rows: PaymentWithCustomer[],
): [string, PaymentWithCustomer[]][] {
  const map = new Map<string, PaymentWithCustomer[]>();
  for (const p of rows) {
    const list = map.get(p.date) ?? [];
    list.push(p);
    map.set(p.date, list);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

/**
 * The "Approved/Rejected by X · date · ..." line shown under a finalized
 * payment. Returns null while the payment is still pending. Shared by the
 * ledger row and the customer-detail row so both surfaces read identically.
 */
export function formatApprovalMeta(
  payment: Pick<
    Payment,
    "approval" | "approvedBy" | "approvedAt" | "rejectReason" | "adminRemark"
  >,
): string | null {
  if (!payment.approvedBy) return null;
  const approval = payment.approval as ApprovalStatus;
  let line = `${APPROVAL_STATUS_LABELS[approval]} by ${payment.approvedBy}`;
  if (payment.approvedAt) {
    line += ` · ${fmtDate(payment.approvedAt as unknown as string)}`;
  }
  if (payment.rejectReason) line += ` · "${payment.rejectReason}"`;
  if (payment.adminRemark) line += ` · note: "${payment.adminRemark}"`;
  return line;
}

export type PaymentTotals = {
  /** Sum of every payment's amount, regardless of approval state. */
  totalPaisas: bigint;
  /** Sum of amounts for `approved` payments, net of their approved reversals. */
  approvedPaisas: bigint;
  /** Sum of approved reversal amounts across all payments. */
  reversedPaisas: bigint;
  /** Number of payments still `pending`. */
  pendingCount: number;
};

/**
 * Summary figures for a (typically filtered) set of payments, matching the
 * Payments ledger cards: the filtered total counts ALL approval states, the
 * approved total counts only `approved` (minus anything since reversed), and
 * pending count is `pending`. `reversedApprovedPaisas` — the sum of a
 * payment's own approved reversals, from `sumApprovedReversalsByPayment` in
 * `features/payment-reversals/lib` — is optional so callers with no
 * reversals to report can pass plain `PaymentWithCustomer` rows unchanged.
 */
export function calculatePaymentTotals(
  rows: (PaymentWithCustomer & { reversedApprovedPaisas?: bigint })[],
): PaymentTotals {
  let totalPaisas = 0n;
  let approvedPaisas = 0n;
  let reversedPaisas = 0n;
  let pendingCount = 0;
  for (const p of rows) {
    totalPaisas += p.amountPaisas;
    if (p.approval === "approved") {
      const reversed = p.reversedApprovedPaisas ?? 0n;
      approvedPaisas += p.amountPaisas - reversed;
      reversedPaisas += reversed;
    }
    if (p.approval === "pending") pendingCount += 1;
  }
  return { totalPaisas, approvedPaisas, reversedPaisas, pendingCount };
}
