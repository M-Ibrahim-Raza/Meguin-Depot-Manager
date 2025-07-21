import { describe, expect, it } from "vitest";
import type { Bill, Payment, PaymentReversal } from "@/server/db/schema";
import { buildLedger, filterLedger, type LedgerEntry } from "./ledger";

function bill(overrides: Partial<Bill> & Pick<Bill, "id" | "date">): Bill {
  return {
    billNo: `B-${overrides.id}`,
    customerId: 1,
    direction: "sale",
    type: "deferred",
    status: "paid",
    note: null,
    amountPaisas: 0n,
    createdBy: null,
    createdAt: new Date(`${overrides.date}T00:00:00Z`),
    approvedBy: null,
    approvedAt: null,
    rejectReason: null,
    ...overrides,
  };
}

function payment(
  overrides: Partial<Payment> & Pick<Payment, "id" | "date">,
): Payment {
  return {
    payId: `P-${overrides.id}`,
    customerId: 1,
    amountPaisas: 0n,
    method: "cash",
    note: null,
    approval: "approved",
    approvedBy: "admin",
    approvedAt: new Date(`${overrides.date}T00:00:00Z`),
    rejectReason: null,
    adminRemark: null,
    createdBy: null,
    createdAt: new Date(`${overrides.date}T00:00:00Z`),
    ...overrides,
  };
}

function reversal(
  overrides: Partial<PaymentReversal> &
    Pick<PaymentReversal, "id" | "paymentId" | "approvedAt">,
): PaymentReversal {
  return {
    reversalNo: `RV-${overrides.id}`,
    customerId: 1,
    amountPaisas: 0n,
    status: "approved",
    reason: "Overpaid by mistake",
    requestedBy: null,
    requestedAt: overrides.approvedAt ?? new Date("2026-01-01T00:00:00Z"),
    approvedBy: "admin",
    rejectReason: null,
    ...overrides,
  };
}

const refs = (entries: LedgerEntry[]) => entries.map((e) => e.ref);

describe("buildLedger", () => {
  it("merges bills, returns, and approved payments into one list, newest first", () => {
    const entries = buildLedger({
      bills: [bill({ id: 1, date: "2026-01-10", amountPaisas: 5000n })],
      returnBills: [
        bill({
          id: 2,
          billNo: "R-2",
          date: "2026-01-20",
          direction: "return",
          amountPaisas: 800n,
        }),
      ],
      payments: [payment({ id: 3, date: "2026-01-15", amountPaisas: 2000n })],
      reversals: [],
    });

    expect(refs(entries)).toEqual(["R-2", "P-3", "B-1"]);
    expect(entries.map((e) => e.kind)).toEqual(["return", "payment", "sale"]);
  });

  it("classifies sales as debit and returns/payments as credit", () => {
    const entries = buildLedger({
      bills: [bill({ id: 1, date: "2026-01-10" })],
      returnBills: [bill({ id: 2, date: "2026-01-11", direction: "return" })],
      payments: [payment({ id: 3, date: "2026-01-12" })],
      reversals: [],
    });
    const byKind = Object.fromEntries(entries.map((e) => [e.kind, e.effect]));
    expect(byKind).toEqual({
      sale: "debit",
      return: "credit",
      payment: "credit",
    });
  });

  it("excludes pending and rejected payments", () => {
    const entries = buildLedger({
      bills: [],
      returnBills: [],
      payments: [
        payment({ id: 1, date: "2026-01-10", approval: "approved" }),
        payment({ id: 2, date: "2026-01-11", approval: "pending" }),
        payment({ id: 3, date: "2026-01-12", approval: "rejected" }),
      ],
      reversals: [],
    });
    expect(refs(entries)).toEqual(["P-1"]);
  });

  it("running balance ties out to outstanding = Σ sales − Σ returns − Σ approved payments", () => {
    const bills = [
      bill({ id: 1, date: "2026-01-10", amountPaisas: 10_000n }),
      bill({ id: 2, date: "2026-02-01", amountPaisas: 6_000n }),
    ];
    const returnBills = [
      bill({
        id: 3,
        date: "2026-01-25",
        direction: "return",
        amountPaisas: 1_500n,
      }),
    ];
    const payments = [
      payment({ id: 4, date: "2026-01-20", amountPaisas: 4_000n }),
      payment({
        id: 5,
        date: "2026-01-22",
        amountPaisas: 99_000n,
        approval: "pending",
      }),
    ];

    const entries = buildLedger({
      bills,
      returnBills,
      payments,
      reversals: [],
    });
    const expectedOutstanding = 10_000n + 6_000n - 1_500n - 4_000n;

    // Newest entry carries the final running balance.
    expect(entries[0].balancePaisas).toBe(expectedOutstanding);
    // Oldest entry's balance equals its own debit (account starts at zero).
    expect(entries[entries.length - 1].balancePaisas).toBe(10_000n);
  });

  it("orders same-date entries by createdAt for deterministic balances", () => {
    const entries = buildLedger({
      bills: [
        bill({
          id: 1,
          date: "2026-01-10",
          amountPaisas: 5_000n,
          createdAt: new Date("2026-01-10T09:00:00Z"),
        }),
      ],
      returnBills: [],
      payments: [
        payment({
          id: 2,
          date: "2026-01-10",
          amountPaisas: 2_000n,
          createdAt: new Date("2026-01-10T11:00:00Z"),
        }),
      ],
      reversals: [],
    });
    // Newest-first: payment (later createdAt) leads, balance 3,000; bill trails at 5,000.
    expect(refs(entries)).toEqual(["P-2", "B-1"]);
    expect(entries[0].balancePaisas).toBe(3_000n);
    expect(entries[1].balancePaisas).toBe(5_000n);
  });

  it("returns an empty list when there is no activity", () => {
    expect(
      buildLedger({ bills: [], returnBills: [], payments: [], reversals: [] }),
    ).toEqual([]);
  });

  it("includes approved reversals as debits, dated by approvedAt", () => {
    const entries = buildLedger({
      bills: [],
      returnBills: [],
      payments: [payment({ id: 1, date: "2026-01-10", amountPaisas: 5_000n })],
      reversals: [
        reversal({
          id: 2,
          paymentId: 1,
          amountPaisas: 2_000n,
          approvedAt: new Date("2026-01-15T00:00:00Z"),
        }),
      ],
    });
    expect(refs(entries)).toEqual(["RV-2", "P-1"]);
    expect(entries[0].kind).toBe("payment_reversal");
    expect(entries[0].effect).toBe("debit");
    expect(entries[0].date).toBe("2026-01-15");
    // Payment credits 5,000 (balance -5,000, i.e. store credit); reversal
    // debits 2,000 back out, leaving -3,000 store credit.
    expect(entries[0].balancePaisas).toBe(-3_000n);
  });

  it("excludes pending and rejected reversals", () => {
    const entries = buildLedger({
      bills: [],
      returnBills: [],
      payments: [payment({ id: 1, date: "2026-01-10", amountPaisas: 5_000n })],
      reversals: [
        reversal({
          id: 2,
          paymentId: 1,
          status: "pending",
          approvedAt: null,
        }),
        reversal({
          id: 3,
          paymentId: 1,
          status: "rejected",
          approvedAt: new Date("2026-01-12T00:00:00Z"),
        }),
      ],
    });
    expect(refs(entries)).toEqual(["P-1"]);
  });
});

describe("filterLedger", () => {
  const entries = buildLedger({
    bills: [bill({ id: 1, date: "2026-01-05", amountPaisas: 5_000n })],
    returnBills: [
      bill({
        id: 2,
        billNo: "R-2",
        date: "2026-01-10",
        direction: "return",
        amountPaisas: 1_000n,
      }),
    ],
    payments: [payment({ id: 3, date: "2026-01-15", amountPaisas: 2_000n })],
    reversals: [],
  });

  it('passes everything through when kinds is unset or "all"', () => {
    expect(filterLedger(entries, {})).toHaveLength(3);
    expect(filterLedger(entries, { kinds: "all" })).toHaveLength(3);
  });

  it('excludes every entry for the "none" sentinel', () => {
    expect(filterLedger(entries, { kinds: "none" })).toEqual([]);
  });

  it("keeps only the requested comma-separated kinds", () => {
    const result = filterLedger(entries, { kinds: "sale,return" });
    expect(result.map((e) => e.kind).sort()).toEqual(["return", "sale"]);
  });

  it("applies an inclusive date range", () => {
    const result = filterLedger(entries, {
      dateFrom: "2026-01-06",
      dateTo: "2026-01-12",
    });
    expect(result.map((e) => e.ref)).toEqual(["R-2"]);
  });

  it("combines kind and date filters", () => {
    const result = filterLedger(entries, {
      kinds: "sale,payment",
      dateTo: "2026-01-10",
    });
    expect(result.map((e) => e.ref)).toEqual(["B-1"]);
  });
});
