import { z } from "zod";
import type { Bill, Payment, PaymentReversal } from "@/server/db/schema";

/** The kind of account movement a ledger entry represents. */
export type LedgerKind = "sale" | "return" | "payment" | "payment_reversal";

/** Whether an entry increases (debit) or decreases (credit) the customer's outstanding. */
export type LedgerEffect = "debit" | "credit";

/**
 * A single, normalized row in the customer ledger — a sale bill, a return bill,
 * or an approved payment — carrying the running balance after the entry is applied.
 */
export type LedgerEntry = {
  /** Stable React key, e.g. "bill-12" / "pay-5". */
  key: string;
  kind: LedgerKind;
  /** Business date, YYYY-MM-DD. */
  date: string;
  /** System timestamp; tiebreaker for same-date ordering. */
  createdAt: Date;
  /** bill.billNo or payment.payId. */
  ref: string;
  note: string | null;
  /** Positive magnitude in paisas. */
  amountPaisas: bigint;
  /** Sales and approved reversals debit the account; returns and payments credit it. */
  effect: LedgerEffect;
  /** Running outstanding balance after this entry (in paisas). */
  balancePaisas: bigint;
  /** The original row, for any future detail rendering. */
  source: Bill | Payment | PaymentReversal;
};

type LedgerInput = {
  bills: Bill[];
  returnBills: Bill[];
  payments: Payment[];
  /** Reversal requests against this customer's payments — only `approved` ones affect the ledger. */
  reversals: PaymentReversal[];
};

type Seed = Omit<LedgerEntry, "balancePaisas">;

/**
 * Merge a customer's sale bills, return bills, approved payments, and approved
 * payment reversals into one chronological ledger with a running balance.
 *
 * Only `approved` payments and `approved` reversals are included, so the latest
 * entry's balance equals the customer's `outstandingPaisas` (outstanding = Σ sales
 * − Σ returns − Σ approved payments + Σ approved reversals, mirroring how the
 * bill/payment/reversal repos mutate the customer record).
 *
 * Returns entries newest-first for display; the balance is accumulated oldest-first
 * over the full history and is unaffected by any later display-time filtering.
 */
export function buildLedger({
  bills,
  returnBills,
  payments,
  reversals,
}: LedgerInput): LedgerEntry[] {
  const seeds: Seed[] = [];

  for (const bill of bills) {
    seeds.push({
      key: `bill-${bill.id}`,
      kind: "sale",
      date: bill.date,
      createdAt: bill.createdAt,
      ref: bill.billNo,
      note: bill.note,
      amountPaisas: bill.amountPaisas,
      effect: "debit",
      source: bill,
    });
  }

  for (const bill of returnBills) {
    seeds.push({
      key: `return-${bill.id}`,
      kind: "return",
      date: bill.date,
      createdAt: bill.createdAt,
      ref: bill.billNo,
      note: bill.note,
      amountPaisas: bill.amountPaisas,
      effect: "credit",
      source: bill,
    });
  }

  for (const payment of payments) {
    if (payment.approval !== "approved") continue;
    seeds.push({
      key: `pay-${payment.id}`,
      kind: "payment",
      date: payment.date,
      createdAt: payment.createdAt,
      ref: payment.payId,
      note: payment.note,
      amountPaisas: payment.amountPaisas,
      effect: "credit",
      source: payment,
    });
  }

  for (const reversal of reversals) {
    if (reversal.status !== "approved" || !reversal.approvedAt) continue;
    seeds.push({
      key: `reversal-${reversal.id}`,
      kind: "payment_reversal",
      date: reversal.approvedAt.toISOString().slice(0, 10),
      createdAt: reversal.approvedAt,
      ref: reversal.reversalNo,
      note: reversal.reason,
      amountPaisas: reversal.amountPaisas,
      // Undoes a payment's credit, so it debits the account like a sale.
      effect: "debit",
      source: reversal,
    });
  }

  // Oldest-first for balance accumulation; stable tiebreak on createdAt then key
  // keeps same-date balances deterministic.
  seeds.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const at = a.createdAt.getTime();
    const bt = b.createdAt.getTime();
    if (at !== bt) return at - bt;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  let balance = 0n;
  const ascending: LedgerEntry[] = seeds.map((seed) => {
    balance += seed.effect === "debit" ? seed.amountPaisas : -seed.amountPaisas;
    return { ...seed, balancePaisas: balance };
  });

  // Newest-first for display, matching the app's other lists.
  return ascending.reverse();
}

/** Display order for kinds in the timeline legend, filter toggles, and export. */
export const LEDGER_KIND_ORDER: LedgerKind[] = [
  "sale",
  "return",
  "payment",
  "payment_reversal",
];

export const LEDGER_KIND_LABELS: Record<LedgerKind, string> = {
  sale: "Sale",
  return: "Return",
  payment_reversal: "Reversal",
  payment: "Payment",
};

/**
 * Ledger export filters. `kinds` is a comma-joined subset of `LedgerKind`, or the
 * sentinels `"all"` (no constraint, the default) / `"none"` (exclude every kind —
 * distinct from omitting the field, so an on-screen "nothing selected" state
 * round-trips through the export dialog instead of silently reverting to "all",
 * since the dialog drops any filter value that's falsy or literally "all").
 * Unlike every other export resource, `customerId` is required: a ledger has no
 * meaning without one, and it feeds three customer-scoped repo calls directly
 * rather than a string-compare over an already-fetched full table.
 */
export const ledgerFilterSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  kinds: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
export type LedgerFilters = z.infer<typeof ledgerFilterSchema>;

/**
 * Shared ledger filter predicate — used by both the customer ledger tab and its
 * export so the exported rows match exactly what is on screen.
 */
export function filterLedger(
  entries: LedgerEntry[],
  f: Pick<LedgerFilters, "kinds" | "dateFrom" | "dateTo">,
): LedgerEntry[] {
  const kindsRaw = f.kinds ?? "all";
  const kinds =
    kindsRaw === "all"
      ? null
      : kindsRaw === "none"
        ? new Set<LedgerKind>()
        : new Set(kindsRaw.split(",") as LedgerKind[]);
  const dateFrom = f.dateFrom ?? "";
  const dateTo = f.dateTo ?? "";
  return entries.filter((e) => {
    if (kinds && !kinds.has(e.kind)) return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });
}
