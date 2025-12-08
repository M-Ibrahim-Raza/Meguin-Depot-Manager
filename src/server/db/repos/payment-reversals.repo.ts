import { and, desc, eq, sql } from "drizzle-orm";
import { validateReversalRequest } from "@/features/payment-reversals/lib";
import { db } from "@/server/db/client";
import {
  customers,
  payments,
  paymentReversals,
  type PaymentReversal,
} from "@/server/db/schema";

export type ReversalWithContext = PaymentReversal & {
  payId: string;
  customerName: string;
  paymentAmountPaisas: bigint;
};

export async function getPendingReversalCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paymentReversals)
    .where(eq(paymentReversals.status, "pending"));
  return Number(row?.count ?? 0);
}

/** All reversal rows across every payment — the table is small; grouping by
 * paymentId (e.g. for the reversed/remaining amount on each payment row) is
 * done in the pure `payment-reversals` lib, not here. */
export async function listAllReversals(): Promise<PaymentReversal[]> {
  return db.select().from(paymentReversals);
}

export async function listReversalsForPayment(
  paymentId: number,
): Promise<PaymentReversal[]> {
  return db
    .select()
    .from(paymentReversals)
    .where(eq(paymentReversals.paymentId, paymentId))
    .orderBy(desc(paymentReversals.requestedAt));
}

/** All reversals against any of a customer's payments — used by the ledger. */
export async function listReversalsForCustomer(
  customerId: number,
): Promise<PaymentReversal[]> {
  return db
    .select()
    .from(paymentReversals)
    .where(eq(paymentReversals.customerId, customerId));
}

/** Pending reversal requests for the admin review queue, newest first. */
export async function listPendingReversalRequests(): Promise<
  ReversalWithContext[]
> {
  const rows = await db
    .select({
      reversal: paymentReversals,
      payId: payments.payId,
      paymentAmountPaisas: payments.amountPaisas,
      customerName: customers.name,
    })
    .from(paymentReversals)
    .innerJoin(payments, eq(payments.id, paymentReversals.paymentId))
    .innerJoin(customers, eq(customers.id, paymentReversals.customerId))
    .where(eq(paymentReversals.status, "pending"))
    .orderBy(desc(paymentReversals.requestedAt));

  return rows.map((r) => ({
    ...r.reversal,
    payId: r.payId,
    paymentAmountPaisas: r.paymentAmountPaisas,
    customerName: r.customerName,
  }));
}

export async function getMaxReversalNo(): Promise<string | null> {
  const [row] = await db
    .select({ reversalNo: paymentReversals.reversalNo })
    .from(paymentReversals)
    .orderBy(
      desc(
        sql`cast(substring(${paymentReversals.reversalNo} from 4) as integer)`,
      ),
    )
    .limit(1);
  return row?.reversalNo ?? null;
}

export type RequestReversalError =
  | "not-found"
  | "payment-not-approved"
  | "amount-not-positive"
  | "exceeds-remaining";

export type RequestReversalResult =
  | { ok: true; reversal: PaymentReversal }
  | { ok: false; error: RequestReversalError };

/**
 * Request a (possibly partial) reversal of an approved payment. Locks the
 * parent payment row first so the read of its existing reversals — used to
 * compute the remaining reversible amount — is stable against a concurrent
 * request or approval against the same payment.
 */
export async function requestReversalTx(input: {
  paymentId: number;
  reversalNo: string;
  amountPaisas: bigint;
  reason: string;
  requestedBy: string | null;
}): Promise<RequestReversalResult> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .for("update")
      .limit(1);
    if (!payment) return { ok: false, error: "not-found" };

    const existing = await tx
      .select({
        status: paymentReversals.status,
        amountPaisas: paymentReversals.amountPaisas,
      })
      .from(paymentReversals)
      .where(eq(paymentReversals.paymentId, input.paymentId));

    const validation = validateReversalRequest(
      payment,
      existing,
      input.amountPaisas,
    );
    if (!validation.ok) return { ok: false, error: validation.error };

    const [reversal] = await tx
      .insert(paymentReversals)
      .values({
        reversalNo: input.reversalNo,
        paymentId: input.paymentId,
        customerId: payment.customerId,
        amountPaisas: input.amountPaisas,
        reason: input.reason,
        requestedBy: input.requestedBy,
      })
      .returning();

    return { ok: true, reversal };
  });
}

export type FinalizeReversalResult =
  | { ok: true; reversal: PaymentReversal }
  | {
      ok: false;
      error: "not-found" | "already-finalized" | "exceeds-remaining";
    };

/**
 * Approve a pending reversal request: re-validates the cross-row sum invariant
 * (Σ approved reversals ≤ payment.amountPaisas) under a lock on the parent
 * payment — the request-time check is only a courtesy, this is authoritative —
 * then credits the customer's outstanding by exactly this reversal's amount.
 */
export async function approveReversalTx(
  reversalId: number,
  approverName: string,
): Promise<FinalizeReversalResult> {
  return db.transaction(async (tx) => {
    const [reversal] = await tx
      .select()
      .from(paymentReversals)
      .where(eq(paymentReversals.id, reversalId))
      .limit(1);
    if (!reversal) return { ok: false, error: "not-found" };

    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, reversal.paymentId))
      .for("update")
      .limit(1);
    if (!payment) return { ok: false, error: "not-found" };

    // Re-read under the payment lock: a concurrent approve/reject of this same
    // request could have finalized it while we were waiting for the lock.
    const [current] = await tx
      .select()
      .from(paymentReversals)
      .where(eq(paymentReversals.id, reversalId))
      .limit(1);
    if (!current || current.status !== "pending") {
      return { ok: false, error: "already-finalized" };
    }

    const approvedSiblings = await tx
      .select({ amountPaisas: paymentReversals.amountPaisas })
      .from(paymentReversals)
      .where(
        and(
          eq(paymentReversals.paymentId, reversal.paymentId),
          eq(paymentReversals.status, "approved"),
        ),
      );
    const approvedSoFar = approvedSiblings.reduce(
      (sum, r) => sum + r.amountPaisas,
      0n,
    );
    if (approvedSoFar + current.amountPaisas > payment.amountPaisas) {
      return { ok: false, error: "exceeds-remaining" };
    }

    const [updated] = await tx
      .update(paymentReversals)
      .set({
        status: "approved",
        approvedBy: approverName,
        approvedAt: new Date(),
        rejectReason: null,
      })
      .where(eq(paymentReversals.id, reversalId))
      .returning();

    await tx
      .update(customers)
      .set({
        outstandingPaisas: sql`${customers.outstandingPaisas} + ${current.amountPaisas}`,
      })
      .where(eq(customers.id, reversal.customerId));

    return { ok: true, reversal: updated };
  });
}

export async function rejectReversalTx(
  reversalId: number,
  approverName: string,
  reason: string,
): Promise<FinalizeReversalResult> {
  return db.transaction(async (tx) => {
    const [reversal] = await tx
      .select()
      .from(paymentReversals)
      .where(eq(paymentReversals.id, reversalId))
      .limit(1);
    if (!reversal) return { ok: false, error: "not-found" };
    if (reversal.status !== "pending") {
      return { ok: false, error: "already-finalized" };
    }

    const [updated] = await tx
      .update(paymentReversals)
      .set({
        status: "rejected",
        approvedBy: approverName,
        approvedAt: new Date(),
        rejectReason: reason,
      })
      .where(eq(paymentReversals.id, reversalId))
      .returning();

    return { ok: true, reversal: updated };
  });
}
