import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import type { StockLocation } from "@/lib/constants";
import { db } from "@/server/db/client";
import {
  billItems,
  bills,
  customers,
  type Bill,
  type BillDirection,
  type BillItem,
  type Customer,
  type NewBill,
  type NewBillItem,
} from "@/server/db/schema";
import {
  deductStockForBillTx,
  restockForReturnBillTx,
} from "@/server/db/repos/stock.repo";

export type BillStats = {
  todayCount: number;
  todayTotalPaisas: bigint;
  monthCount: number;
  monthTotalPaisas: bigint;
};

export type BillWithCustomer = Bill & {
  customerName: string;
  customerArea: string | null;
};

/** Every bill across all customers (sale and return), newest first, joined with customer name. */
export async function listAllBills(): Promise<BillWithCustomer[]> {
  const rows = await db
    .select({
      bill: bills,
      customerName: customers.name,
      customerArea: customers.area,
    })
    .from(bills)
    .innerJoin(customers, eq(customers.id, bills.customerId))
    .orderBy(desc(bills.date), desc(bills.id));

  return rows.map((r) => ({
    ...r.bill,
    customerName: r.customerName,
    customerArea: r.customerArea,
  }));
}

export type CreateBillTxInput = {
  billNo: string;
  customerId: number;
  date: string;
  type: string;
  status: string;
  note: string | null;
  amountPaisas: bigint;
  items: Array<{
    articleNumber: string;
    sourceLocation: StockLocation;
    nameSnapshot: string;
    unitSnapshot: string;
    unitPricePaisas: bigint;
    /** The product's catalogue price at sale time (for the upsell delta). */
    basePricePaisas: bigint;
    qty: string;
  }>;
  /** When > 0 and bill is deferred, add to customer.outstandingPaisas. */
  outstandingDeltaPaisas: bigint;
  /** User id recorded on the bill and each stock movement (null if unknown). */
  createdBy: string | null;
  /** Admin override: allow stock to go negative instead of blocking. */
  allowNegative: boolean;
};

export type CreateReturnBillTxInput = {
  billNo: string;
  customerId: number;
  date: string;
  /** "paid" settles immediately (admin); "pending_approval" awaits admin review (user). */
  status: "paid" | "pending_approval";
  note: string | null;
  /** Positive credit value of the return. */
  amountPaisas: bigint;
  items: Array<{
    articleNumber: string;
    nameSnapshot: string;
    unitSnapshot: string;
    /** Latest sale unit price the customer paid for this product. */
    unitPricePaisas: bigint;
    /** No upsell concept for returns — always equal to unitPricePaisas. */
    basePricePaisas: bigint;
    qty: string;
  }>;
  createdBy: string | null;
};

export type BillWithDetails = {
  bill: Bill;
  customer: Customer;
  items: BillItem[];
};

/**
 * Fetch one bill with its customer and line items, for the print sheet.
 * Two indexed selects: a 1:1 bill×customer join, then the items by billId.
 */
export async function getBillById(
  billId: number,
): Promise<BillWithDetails | undefined> {
  const [row] = await db
    .select({ bill: bills, customer: customers })
    .from(bills)
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .where(eq(bills.id, billId))
    .limit(1);
  if (!row) return undefined;

  const items = await db
    .select()
    .from(billItems)
    .where(eq(billItems.billId, billId))
    .orderBy(asc(billItems.id));

  return { bill: row.bill, customer: row.customer, items };
}

export async function getMaxBillNo(): Promise<string | null> {
  const [row] = await db
    .select({ billNo: bills.billNo })
    .from(bills)
    .where(eq(bills.direction, "sale"))
    .orderBy(desc(sql`cast(substring(${bills.billNo} from 3) as integer)`))
    .limit(1);
  return row?.billNo ?? null;
}

/** Highest existing return-bill number (R-<n>), for the next-number preview. */
export async function getMaxReturnBillNo(): Promise<string | null> {
  const [row] = await db
    .select({ billNo: bills.billNo })
    .from(bills)
    .where(eq(bills.direction, "return"))
    .orderBy(desc(sql`cast(substring(${bills.billNo} from 3) as integer)`))
    .limit(1);
  return row?.billNo ?? null;
}

export async function createBillTx(
  input: CreateBillTxInput,
): Promise<{ bill: Bill }> {
  return db.transaction(async (tx) => {
    const billRow: NewBill = {
      billNo: input.billNo,
      customerId: input.customerId,
      date: input.date,
      type: input.type,
      status: input.status,
      note: input.note,
      amountPaisas: input.amountPaisas,
      createdBy: input.createdBy,
    };
    const [bill] = await tx.insert(bills).values(billRow).returning();

    if (input.items.length > 0) {
      const rows: NewBillItem[] = input.items.map((it) => ({
        billId: bill.id,
        articleNumber: it.articleNumber,
        sourceLocation: it.sourceLocation,
        nameSnapshot: it.nameSnapshot,
        unitSnapshot: it.unitSnapshot,
        unitPricePaisas: it.unitPricePaisas,
        basePricePaisas: it.basePricePaisas,
        qty: it.qty,
      }));
      await tx.insert(billItems).values(rows);
    }

    // Deduct stock for each line atomically, from its chosen source location.
    // Throws InsufficientStockError (rolling back the whole bill) unless the
    // caller passed an override.
    await deductStockForBillTx(tx, {
      items: input.items.map((it) => ({
        articleNumber: it.articleNumber,
        location: it.sourceLocation,
        qty: Number(it.qty),
      })),
      billId: bill.id,
      createdBy: input.createdBy,
      allowNegative: input.allowNegative,
    });

    if (input.status === "unpaid" && input.outstandingDeltaPaisas > 0n) {
      await tx
        .update(customers)
        .set({
          outstandingPaisas: sql`${customers.outstandingPaisas} + ${input.outstandingDeltaPaisas}`,
        })
        .where(eq(customers.id, input.customerId));
    }

    return { bill };
  });
}

/**
 * Record a return bill (credit note) atomically: insert the bill + its lines,
 * add the returned quantity back to stock (ledger kind "return"), and — only
 * when it settles immediately (`status: "paid"`, i.e. created by an admin) —
 * reduce the customer's outstanding by the credit value. A user's return is
 * inserted as `pending_approval`: stock still restocks now (inventory stays
 * accurate regardless of approval), but outstanding only moves once an admin
 * calls `approveReturnBillTx`. Outstanding has no floor when it does move —
 * it may go negative, representing store credit owed to the customer
 * (consistent with how an approved payment subtracts unconditionally).
 */
export async function createReturnBillTx(
  input: CreateReturnBillTxInput,
): Promise<{ bill: Bill }> {
  return db.transaction(async (tx) => {
    const billRow: NewBill = {
      billNo: input.billNo,
      customerId: input.customerId,
      date: input.date,
      direction: "return",
      // A return is a settled credit note: not a cash/deferred sale, no balance owed.
      type: "deferred",
      status: input.status,
      note: input.note,
      amountPaisas: input.amountPaisas,
      createdBy: input.createdBy,
    };
    const [bill] = await tx.insert(bills).values(billRow).returning();

    if (input.items.length > 0) {
      const rows: NewBillItem[] = input.items.map((it) => ({
        billId: bill.id,
        articleNumber: it.articleNumber,
        nameSnapshot: it.nameSnapshot,
        unitSnapshot: it.unitSnapshot,
        unitPricePaisas: it.unitPricePaisas,
        basePricePaisas: it.basePricePaisas,
        qty: it.qty,
      }));
      await tx.insert(billItems).values(rows);
    }

    // Add the returned quantity back to on-hand (ledger kind "return"), even
    // while pending approval — same principle as a sale deducting stock
    // immediately regardless of its own pending_approval state.
    // Customer returns come back into the warehouse (the canonical receiving
    // location); the bill_item.sourceLocation defaults to warehouse to match.
    await restockForReturnBillTx(tx, {
      items: input.items.map((it) => ({
        articleNumber: it.articleNumber,
        location: "warehouse" as const,
        qty: Number(it.qty),
      })),
      billId: bill.id,
      createdBy: input.createdBy,
    });

    // Reduce outstanding by the credit value only once settled — no floor
    // (may go negative). A pending return bumps outstanding later, on approval.
    if (input.status === "paid") {
      await tx
        .update(customers)
        .set({
          outstandingPaisas: sql`${customers.outstandingPaisas} - ${input.amountPaisas}`,
        })
        .where(eq(customers.id, input.customerId));
    }

    return { bill };
  });
}

export async function getBillStats(today: string): Promise<BillStats> {
  // First day of `today`'s month, formatted YYYY-MM-01.
  const monthStart = today.slice(0, 8) + "01";

  const [todayRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<bigint>`coalesce(sum(${bills.amountPaisas}), 0)::bigint`,
    })
    .from(bills)
    .where(
      and(
        eq(bills.direction, "sale"),
        ne(bills.status, "rejected"),
        eq(bills.date, today),
      ),
    );

  const [monthRow] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<bigint>`coalesce(sum(${bills.amountPaisas}), 0)::bigint`,
    })
    .from(bills)
    .where(
      and(
        eq(bills.direction, "sale"),
        ne(bills.status, "rejected"),
        gte(bills.date, monthStart),
      ),
    );

  return {
    todayCount: Number(todayRow?.count ?? 0),
    todayTotalPaisas: BigInt(todayRow?.total ?? 0),
    monthCount: Number(monthRow?.count ?? 0),
    monthTotalPaisas: BigInt(monthRow?.total ?? 0),
  };
}

type ApprovalResult =
  | { ok: true }
  | { ok: false; error: "not-found" | "already-finalized" };

export async function approveBillTx(
  billId: number,
  approverName: string,
): Promise<ApprovalResult> {
  return db.transaction(async (tx) => {
    const [bill] = await tx
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    if (!bill) return { ok: false, error: "not-found" };
    if (bill.status !== "pending_approval")
      return { ok: false, error: "already-finalized" };

    await tx
      .update(bills)
      .set({
        status: "unpaid",
        approvedBy: approverName,
        approvedAt: new Date(),
      })
      .where(eq(bills.id, billId));

    if (bill.amountPaisas > 0n) {
      await tx
        .update(customers)
        .set({
          outstandingPaisas: sql`${customers.outstandingPaisas} + ${bill.amountPaisas}`,
        })
        .where(eq(customers.id, bill.customerId));
    }

    return { ok: true };
  });
}

export async function rejectBillTx(
  billId: number,
  approverName: string,
  reason?: string,
): Promise<ApprovalResult> {
  return db.transaction(async (tx) => {
    const [bill] = await tx
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    if (!bill) return { ok: false, error: "not-found" };
    if (bill.status !== "pending_approval")
      return { ok: false, error: "already-finalized" };

    await tx
      .update(bills)
      .set({
        status: "rejected",
        approvedBy: approverName,
        approvedAt: new Date(),
        rejectReason: reason ?? null,
      })
      .where(eq(bills.id, billId));

    // Restore each line to the exact location it was drawn from (we still have
    // the original bill_item rows, so origin is unambiguous here).
    await restockForReturnBillTx(tx, {
      items: (
        await tx.select().from(billItems).where(eq(billItems.billId, billId))
      ).map((item) => ({
        articleNumber: item.articleNumber,
        location: item.sourceLocation as StockLocation,
        qty: Number(item.qty),
      })),
      billId: bill.id,
      createdBy: approverName,
    });

    return { ok: true };
  });
}

/** Count of sale bills awaiting admin approval (nav badge). Direction-scoped
 * so a pending return bill — a separate approval queue — isn't counted here. */
export async function getPendingBillsCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bills)
    .where(
      and(eq(bills.status, "pending_approval"), eq(bills.direction, "sale")),
    );
  return row?.count ?? 0;
}

/** Approve a `pending_approval` return bill (admin only): settles it (`paid`)
 * and reduces the customer's outstanding by the credit value (no floor). */
export async function approveReturnBillTx(
  billId: number,
  approverId: string,
): Promise<ApprovalResult> {
  return db.transaction(async (tx) => {
    const [bill] = await tx
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    if (!bill) return { ok: false, error: "not-found" };
    if (bill.status !== "pending_approval")
      return { ok: false, error: "already-finalized" };

    await tx
      .update(bills)
      .set({
        status: "paid",
        approvedBy: approverId,
        approvedAt: new Date(),
      })
      .where(eq(bills.id, billId));

    if (bill.amountPaisas > 0n) {
      await tx
        .update(customers)
        .set({
          outstandingPaisas: sql`${customers.outstandingPaisas} - ${bill.amountPaisas}`,
        })
        .where(eq(customers.id, bill.customerId));
    }

    return { ok: true };
  });
}

/** Reject a `pending_approval` return bill (admin only): marks it `rejected`
 * and reverses the speculative restock by deducting the same qty back out of
 * the warehouse (reuses the sale-side deduct helper — a "sale"-kind movement
 * is exactly the mirror of the "return"-kind one it undoes). Outstanding is
 * untouched — a pending return never moved it. */
export async function rejectReturnBillTx(
  billId: number,
  approverId: string,
  reason?: string,
): Promise<ApprovalResult> {
  return db.transaction(async (tx) => {
    const [bill] = await tx
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    if (!bill) return { ok: false, error: "not-found" };
    if (bill.status !== "pending_approval")
      return { ok: false, error: "already-finalized" };

    await tx
      .update(bills)
      .set({
        status: "rejected",
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectReason: reason ?? null,
      })
      .where(eq(bills.id, billId));

    const items = await tx
      .select()
      .from(billItems)
      .where(eq(billItems.billId, billId));

    await deductStockForBillTx(tx, {
      items: items.map((item) => ({
        articleNumber: item.articleNumber,
        location: "warehouse" as const,
        qty: Number(item.qty),
      })),
      billId: bill.id,
      createdBy: approverId,
    });

    return { ok: true };
  });
}

/** Count of return bills awaiting admin approval (nav badge). */
export async function getPendingReturnBillsCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bills)
    .where(
      and(eq(bills.status, "pending_approval"), eq(bills.direction, "return")),
    );
  return row?.count ?? 0;
}

/** Helper: count pending bills by customer, filtered by direction. */
async function countPendingBillsByCustomer(
  direction: BillDirection,
): Promise<{ customerId: number; count: number }[]> {
  const rows = await db
    .select({
      customerId: bills.customerId,
      count: sql<number>`count(*)::int`,
    })
    .from(bills)
    .where(
      and(eq(bills.status, "pending_approval"), eq(bills.direction, direction)),
    )
    .groupBy(bills.customerId);
  return rows.map((r) => ({
    customerId: r.customerId,
    count: Number(r.count),
  }));
}

/** Per-customer count of sale bills awaiting admin approval. */
export async function getPendingBillCountByCustomer(): Promise<
  { customerId: number; count: number }[]
> {
  return countPendingBillsByCustomer("sale");
}

/** Per-customer count of return bills awaiting admin approval. */
export async function getPendingReturnBillCountByCustomer(): Promise<
  { customerId: number; count: number }[]
> {
  return countPendingBillsByCustomer("return");
}
