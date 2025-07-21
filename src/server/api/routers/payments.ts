import { TRPCError } from "@trpc/server";
import {
  approvePaymentSchema,
  recordPaymentSchema,
  rejectPaymentSchema,
} from "@/features/payments/schemas";
import { nextPaymentId, rupeesToPaisas } from "@/lib/format";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  approvePaymentTx,
  createPaymentTx,
  getMaxPayId,
  getPendingApprovalCount,
  getPendingPaymentCountByCustomer,
  listAllPayments,
  rejectPaymentTx,
} from "@/server/db/repos/payments.repo";

/**
 * Payment API. A user may record payments (created `pending`); only an admin may
 * approve/reject them. Outstanding is reduced only on approval — see
 * docs/adr/0004-role-based-approval-workflow.md. Amounts arrive as rupees and are
 * stored as `bigint` paisas.
 */
export const paymentsRouter = createTRPCRouter({
  /** All payments, joined with customer name (newest first). */
  list: protectedProcedure.query(() => listAllPayments()),

  /** Count of payments awaiting admin approval (for the nav badge). */
  pendingCount: protectedProcedure.query(() => getPendingApprovalCount()),

  /** Per-customer pending-payment counts (admin only). */
  pendingCountByCustomer: adminProcedure.query(() =>
    getPendingPaymentCountByCustomer(),
  ),

  /** Record a payment in `pending` state. Allocates the next `P-NNN` id. */
  record: protectedProcedure
    .input(recordPaymentSchema)
    .mutation(async ({ input }) => {
      const maxPayId = await getMaxPayId();
      const payId = nextPaymentId(maxPayId ? [{ payId: maxPayId }] : []);
      const payment = await createPaymentTx({
        payId,
        customerId: input.customerId,
        date: input.date,
        amountPaisas: rupeesToPaisas(input.amountRupees),
        method: input.method,
        note: input.note?.trim() ? input.note.trim() : null,
      });
      return { paymentId: payment.id, payId: payment.payId };
    }),

  /** Approve a pending payment (admin only): reduces the customer's outstanding. */
  approve: adminProcedure
    .input(approvePaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const approverName =
        ctx.session.user.name ?? ctx.session.user.email ?? "Admin";
      const result = await approvePaymentTx(
        input.id,
        approverName,
        input.remark,
      );
      if (!result.ok) {
        throw new TRPCError(
          result.error === "not-found"
            ? { code: "NOT_FOUND", message: "Payment not found" }
            : { code: "CONFLICT", message: "Payment already finalized" },
        );
      }
      return { id: result.payment.id };
    }),

  /** Reject a pending payment (admin only): balance is left untouched. */
  reject: adminProcedure
    .input(rejectPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const approverName =
        ctx.session.user.name ?? ctx.session.user.email ?? "Admin";
      const result = await rejectPaymentTx(
        input.id,
        approverName,
        input.reason,
        input.remark,
      );
      if (!result.ok) {
        throw new TRPCError(
          result.error === "not-found"
            ? { code: "NOT_FOUND", message: "Payment not found" }
            : { code: "CONFLICT", message: "Payment already finalized" },
        );
      }
      return { id: result.payment.id };
    }),
});
