import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  customers,
  payments,
  type NewPayment,
  type Payment,
} from "@/server/db/schema";

export type PaymentWithCustomer = Payment & {
  customerName: string;
  customerArea: string | null;
};

export async function getPendingApprovalCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(payments)
    .where(eq(payments.approval, "pending"));
  return Number(row?.count ?? 0);
}

export async function getPendingPaymentCountByCustomer(): Promise<
  { customerId: number; count: number }[]
> {
  const rows = await db
    .select({
      customerId: payments.customerId,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(eq(payments.approval, "pending"))
    .groupBy(payments.customerId);
  return rows.map((r) => ({
    customerId: r.customerId,
    count: Number(r.count),
  }));
}

export async function listAllPayments(): Promise<PaymentWithCustomer[]> {
  const rows = await db
    .select({
      payment: payments,
      customerName: customers.name,
      customerArea: customers.area,
    })
    .from(payments)
    .innerJoin(customers, eq(customers.id, payments.customerId))
    .orderBy(desc(payments.date), desc(payments.id));

  return rows.map((r) => ({
    ...r.payment,
    customerName: r.customerName,
    customerArea: r.customerArea,
  }));
}

export async function getPayment(id: number): Promise<Payment | undefined> {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);
  return row;
}

export async function getMaxPayId(): Promise<string | null> {
  const [row] = await db
    .select({ payId: payments.payId })
    .from(payments)
    .orderBy(desc(sql`cast(substring(${payments.payId} from 3) as integer)`))
    .limit(1);
  return row?.payId ?? null;
}

export async function createPaymentTx(
  input: Omit<NewPayment, "approval" | "approvedBy" | "approvedAt"> & {
    /** Payments are always created pending. */
  },
): Promise<Payment> {
  const [payment] = await db
    .insert(payments)
    .values({
      ...input,
      approval: "pending",
    })
    .returning();
  return payment;
}

export type FinalizeResult =
  | { ok: true; payment: Payment }
  | { ok: false; error: "not-found" | "already-finalized" };

export async function approvePaymentTx(
  paymentId: number,
  approverName: string,
  remark?: string,
): Promise<FinalizeResult> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);
    if (!payment) return { ok: false, error: "not-found" };
    if (payment.approval !== "pending") {
      return { ok: false, error: "already-finalized" };
    }
    const [updated] = await tx
      .update(payments)
      .set({
        approval: "approved",
        approvedBy: approverName,
        approvedAt: new Date(),
        rejectReason: null,
        adminRemark: remark?.trim() ? remark.trim() : null,
      })
      .where(eq(payments.id, paymentId))
      .returning();

    await tx
      .update(customers)
      .set({
        outstandingPaisas: sql`${customers.outstandingPaisas} - ${payment.amountPaisas}`,
        lastPaymentDate: payment.date,
        lastPaymentPaisas: payment.amountPaisas,
      })
      .where(eq(customers.id, payment.customerId));

    return { ok: true, payment: updated };
  });
}

export async function rejectPaymentTx(
  paymentId: number,
  approverName: string,
  reason: string,
  remark?: string,
): Promise<FinalizeResult> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .limit(1);
    if (!payment) return { ok: false, error: "not-found" };
    if (payment.approval !== "pending") {
      return { ok: false, error: "already-finalized" };
    }
    const [updated] = await tx
      .update(payments)
      .set({
        approval: "rejected",
        approvedBy: approverName,
        approvedAt: new Date(),
        rejectReason: reason,
        adminRemark: remark?.trim() ? remark.trim() : null,
      })
      .where(eq(payments.id, paymentId))
      .returning();
    return { ok: true, payment: updated };
  });
}
