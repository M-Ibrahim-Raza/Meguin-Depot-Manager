import { describe, expect, it } from "vitest";
import { fmtDate } from "@/lib/format";
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";
import {
  calculatePaymentTotals,
  filterPayments,
  formatApprovalMeta,
  groupPaymentsByDate,
} from "./lib";

function pay(over: Partial<PaymentWithCustomer>): PaymentWithCustomer {
  return {
    id: 1,
    payId: "P-001",
    customerId: 1,
    date: "2026-06-15",
    amountPaisas: 1000n,
    method: "cash",
    note: null,
    approval: "approved",
    approvedBy: null,
    approvedAt: null,
    rejectReason: null,
    adminRemark: null,
    createdBy: null,
    createdAt: new Date("2026-06-15"),
    customerName: "Ali Traders",
    customerArea: null,
    ...over,
  } as PaymentWithCustomer;
}

const rows = [
  pay({
    id: 1,
    payId: "P-001",
    date: "2026-06-01",
    approval: "approved",
    method: "cash",
    customerId: 1,
    customerName: "Ali",
  }),
  pay({
    id: 2,
    payId: "P-002",
    date: "2026-06-15",
    approval: "pending",
    method: "bank",
    customerId: 2,
    customerName: "Noor",
    note: "advance",
  }),
  pay({
    id: 3,
    payId: "P-003",
    date: "2026-06-30",
    approval: "approved",
    method: "cheque",
    customerId: 1,
    customerName: "Ali",
  }),
];

describe("filterPayments", () => {
  it("filters by approval and method", () => {
    expect(
      filterPayments(rows, { approval: "pending" }).map((p) => p.id),
    ).toEqual([2]);
    expect(filterPayments(rows, { method: "cheque" }).map((p) => p.id)).toEqual(
      [3],
    );
  });

  it("filters by customerId (string compare)", () => {
    expect(filterPayments(rows, { customerId: "1" }).map((p) => p.id)).toEqual([
      1, 3,
    ]);
  });

  it("applies an inclusive date range", () => {
    expect(
      filterPayments(rows, {
        dateFrom: "2026-06-15",
        dateTo: "2026-06-30",
      }).map((p) => p.id),
    ).toEqual([2, 3]);
    // boundary dates are kept
    expect(
      filterPayments(rows, { dateFrom: "2026-06-30" }).map((p) => p.id),
    ).toEqual([3]);
  });

  it("searches customer name, payId, and note", () => {
    expect(filterPayments(rows, { search: "noor" }).map((p) => p.id)).toEqual([
      2,
    ]);
    expect(filterPayments(rows, { search: "P-003" }).map((p) => p.id)).toEqual([
      3,
    ]);
    expect(
      filterPayments(rows, { search: "advance" }).map((p) => p.id),
    ).toEqual([2]);
  });

  it("treats 'all'/empty as no constraint", () => {
    expect(
      filterPayments(rows, {
        approval: "all",
        method: "all",
        customerId: "all",
      }),
    ).toHaveLength(3);
  });
});

describe("groupPaymentsByDate", () => {
  it("groups payments by date, newest date first", () => {
    const grouped = groupPaymentsByDate(rows);
    expect(grouped.map(([date]) => date)).toEqual([
      "2026-06-30",
      "2026-06-15",
      "2026-06-01",
    ]);
  });

  it("collects all payments sharing a date, preserving input order", () => {
    const sameDay = [
      pay({ id: 10, date: "2026-06-15" }),
      pay({ id: 11, date: "2026-06-01" }),
      pay({ id: 12, date: "2026-06-15" }),
    ];
    const grouped = groupPaymentsByDate(sameDay);
    expect(grouped.map(([date]) => date)).toEqual(["2026-06-15", "2026-06-01"]);
    const [, juneFifteen] = grouped[0];
    expect(juneFifteen.map((p) => p.id)).toEqual([10, 12]);
  });

  it("returns an empty array for no payments", () => {
    expect(groupPaymentsByDate([])).toEqual([]);
  });
});

describe("formatApprovalMeta", () => {
  it("returns null while a payment is still pending", () => {
    expect(
      formatApprovalMeta(
        pay({ approval: "pending", approvedBy: null, approvedAt: null }),
      ),
    ).toBeNull();
  });

  const approvedAt = new Date("2026-06-15");
  const approvedAtLabel = fmtDate(approvedAt as unknown as string);

  it("formats an approval with a remark", () => {
    const line = formatApprovalMeta(
      pay({
        approval: "approved",
        approvedBy: "Admin",
        approvedAt,
        adminRemark: "Confirmed with bank",
      }),
    );
    expect(line).toBe(
      `Approved by Admin · ${approvedAtLabel} · note: "Confirmed with bank"`,
    );
  });

  it("formats a rejection with a reason only", () => {
    const line = formatApprovalMeta(
      pay({
        approval: "rejected",
        approvedBy: "Admin",
        approvedAt,
        rejectReason: "Bank mismatch",
      }),
    );
    expect(line).toBe(
      `Rejected by Admin · ${approvedAtLabel} · "Bank mismatch"`,
    );
  });

  it("formats a rejection with both a reason and a remark", () => {
    const line = formatApprovalMeta(
      pay({
        approval: "rejected",
        approvedBy: "Admin",
        approvedAt,
        rejectReason: "Bank mismatch",
        adminRemark: "Customer notified by phone",
      }),
    );
    expect(line).toBe(
      `Rejected by Admin · ${approvedAtLabel} · "Bank mismatch" · note: "Customer notified by phone"`,
    );
  });
});

describe("calculatePaymentTotals", () => {
  it("totals all amounts regardless of approval, sums only approved, counts pending", () => {
    const sample = [
      pay({ id: 1, approval: "approved", amountPaisas: 1000n }),
      pay({ id: 2, approval: "pending", amountPaisas: 500n }),
      pay({ id: 3, approval: "rejected", amountPaisas: 250n }),
      pay({ id: 4, approval: "approved", amountPaisas: 700n }),
      pay({ id: 5, approval: "pending", amountPaisas: 999n }),
    ];
    expect(calculatePaymentTotals(sample)).toEqual({
      totalPaisas: 3449n,
      approvedPaisas: 1700n,
      reversedPaisas: 0n,
      pendingCount: 2,
    });
  });

  it("rejected payments count toward the filtered total but not approved/pending", () => {
    const sample = [pay({ approval: "rejected", amountPaisas: 800n })];
    expect(calculatePaymentTotals(sample)).toEqual({
      totalPaisas: 800n,
      approvedPaisas: 0n,
      reversedPaisas: 0n,
      pendingCount: 0,
    });
  });

  it("nets an approved payment's amount by its approved reversals, and tracks the reversed total separately", () => {
    const sample = [
      {
        ...pay({ id: 1, approval: "approved", amountPaisas: 5000n }),
        reversedApprovedPaisas: 2000n,
      },
      pay({ id: 2, approval: "approved", amountPaisas: 1000n }),
    ];
    expect(calculatePaymentTotals(sample)).toEqual({
      totalPaisas: 6000n,
      approvedPaisas: 4000n,
      reversedPaisas: 2000n,
      pendingCount: 0,
    });
  });

  it("returns zeroed totals for no payments", () => {
    expect(calculatePaymentTotals([])).toEqual({
      totalPaisas: 0n,
      approvedPaisas: 0n,
      reversedPaisas: 0n,
      pendingCount: 0,
    });
  });
});
