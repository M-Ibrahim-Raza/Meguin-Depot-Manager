import { TRPCError } from "@trpc/server";
import {
  approveReversalSchema,
  rejectReversalSchema,
  requestReversalSchema,
} from "@/features/payment-reversals/schemas";
import { nextReversalNo, rupeesToPaisas } from "@/lib/format";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  approveReversalTx,
  getMaxReversalNo,
  getPendingReversalCount,
  listAllReversals,
  listPendingReversalRequests,
  listReversalsForCustomer,
  listReversalsForPayment,
  rejectReversalTx,
  requestReversalTx,
} from "@/server/db/repos/payment-reversals.repo";
import { z } from "zod";

function mapRequestError(error: string): never {
  if (error === "not-found") {
    throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
  }
  if (error === "payment-not-approved") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only an approved payment can be reversed",
    });
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Amount exceeds what's still reversible on this payment",
  });
}

/**
 * Payment reversal API. Any user may request a (possibly partial) reversal of
 * an approved payment; only an admin may approve/reject the request. Outstanding
 * is credited only on approval — see docs/adr/0009-payment-reversal-requests.md.
 */
export const paymentReversalsRouter = createTRPCRouter({
  /** All reversals, for grouping by payment on the client (small table). */
  listAll: protectedProcedure.query(() => listAllReversals()),

  listForPayment: protectedProcedure
    .input(requestReversalSchema.pick({ paymentId: true }))
    .query(({ input }) => listReversalsForPayment(input.paymentId)),

  /** Reversals for a specific customer, scoped by customerId. */
  listByCustomer: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => listReversalsForCustomer(input.customerId)),

  /** Count of reversal requests awaiting admin review (for the nav badge). */
  pendingCount: protectedProcedure.query(() => getPendingReversalCount()),

  /** Admin review queue. */
  listPending: adminProcedure.query(() => listPendingReversalRequests()),

  /** Request a reversal (pending state). Allocates the next `RV-NNN` id. */
  request: protectedProcedure
    .input(requestReversalSchema)
    .mutation(async ({ ctx, input }) => {
      const maxReversalNo = await getMaxReversalNo();
      const reversalNo = nextReversalNo(
        maxReversalNo ? [{ reversalNo: maxReversalNo }] : [],
      );
      const result = await requestReversalTx({
        paymentId: input.paymentId,
        reversalNo,
        amountPaisas: rupeesToPaisas(input.amountRupees),
        reason: input.reason,
        requestedBy: ctx.session.user.id,
      });
      if (!result.ok) mapRequestError(result.error);
      return { id: result.reversal.id, reversalNo: result.reversal.reversalNo };
    }),

  /** Approve a pending reversal (admin only): credits the customer's outstanding. */
  approve: adminProcedure
    .input(approveReversalSchema)
    .mutation(async ({ ctx, input }) => {
      const approverName =
        ctx.session.user.name ?? ctx.session.user.email ?? "Admin";
      const result = await approveReversalTx(input.id, approverName);
      if (!result.ok) {
        throw new TRPCError(
          result.error === "not-found"
            ? { code: "NOT_FOUND", message: "Reversal request not found" }
            : result.error === "already-finalized"
              ? {
                  code: "CONFLICT",
                  message: "Reversal request already finalized",
                }
              : {
                  code: "CONFLICT",
                  message:
                    "Amount exceeds what's still reversible on this payment",
                },
        );
      }
      return { id: result.reversal.id };
    }),

  /** Reject a pending reversal (admin only): balance is left untouched. */
  reject: adminProcedure
    .input(rejectReversalSchema)
    .mutation(async ({ ctx, input }) => {
      const approverName =
        ctx.session.user.name ?? ctx.session.user.email ?? "Admin";
      const result = await rejectReversalTx(
        input.id,
        approverName,
        input.reason,
      );
      if (!result.ok) {
        throw new TRPCError(
          result.error === "not-found"
            ? { code: "NOT_FOUND", message: "Reversal request not found" }
            : {
                code: "CONFLICT",
                message: "Reversal request already finalized",
              },
        );
      }
      return { id: result.reversal.id };
    }),
});
