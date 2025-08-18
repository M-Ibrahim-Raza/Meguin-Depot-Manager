import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  computeReturnBillStatus,
  validateReturnItems,
} from "@/features/returns/lib";
import { createReturnSchema } from "@/features/returns/schemas";
import { fmtQty } from "@/features/stock/lib";
import { nextReturnBillNo } from "@/lib/format";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  approveReturnBillTx,
  createReturnBillTx,
  getMaxReturnBillNo,
  getPendingReturnBillCountByCustomer,
  getPendingReturnBillsCount,
  rejectReturnBillTx,
} from "@/server/db/repos/bills.repo";
import { getCustomer } from "@/server/db/repos/customers.repo";
import { getReturnableProducts } from "@/server/db/repos/returns.repo";
import { InsufficientStockError } from "@/server/db/repos/stock.repo";

const customerIdInput = z.object({ customerId: z.number().int().positive() });

/**
 * Return-bill (credit note) API. Reads and creation are open to any signed-in
 * user (`protectedProcedure`); approving/rejecting a pending return and the
 * pending-count badge are admin-only (`adminProcedure`). A return restocks the
 * returned quantity into the warehouse immediately either way. An admin's
 * return settles immediately (`paid`) and reduces the customer's outstanding
 * right away; a user's return is recorded `pending_approval` with outstanding
 * untouched until an admin approves it (or rejects it, which reverses the
 * restock). Outstanding has no floor — it may go negative. Lines are capped
 * at what the customer still holds (sold − already returned) and priced at
 * the latest unit price they paid. Amounts are `bigint` paisas.
 */
export const returnsRouter = createTRPCRouter({
  /** Preview the next return bill number (`R-NNN`) without allocating it. */
  nextNoPreview: protectedProcedure.query(async () => {
    const maxNo = await getMaxReturnBillNo();
    return nextReturnBillNo(maxNo ? [{ billNo: maxNo }] : []);
  }),

  /** Products this customer can still return, with cap qty and latest paid price. */
  returnableProducts: protectedProcedure
    .input(customerIdInput)
    .query(({ input }) => getReturnableProducts(input.customerId)),

  /**
   * Create a return bill: validates each line against the customer's
   * returnable pool, then atomically records the credit note and restocks the
   * returned quantity. An admin's return settles immediately and reduces the
   * customer's outstanding now; a user's return is submitted for admin
   * approval (outstanding moves later, on approval).
   */
  create: protectedProcedure
    .input(createReturnSchema)
    .mutation(async ({ input, ctx }) => {
      const [customer, returnable] = await Promise.all([
        getCustomer(input.customerId),
        getReturnableProducts(input.customerId),
      ]);
      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Validate and price each line against the customer's returnable pool.
      const returnableByArticle = new Map(
        returnable.map((r) => [r.articleNumber, r]),
      );
      const result = validateReturnItems(input.items, returnableByArticle);
      if (!result.ok) {
        let message: string;
        if (result.error === "not-returnable") {
          message = `${result.articleNumber} is not returnable for this customer`;
        } else if (result.error === "duplicate") {
          message = "Duplicate product line";
        } else {
          // over-cap: the article is in the pool (not-returnable is checked
          // first) and unique (duplicate is checked first), so this is its line.
          const r = returnableByArticle.get(result.articleNumber)!;
          const requestedQty = input.items.find(
            (it) => it.articleNumber === result.articleNumber,
          )?.qty;
          message = `Cannot return ${fmtQty(requestedQty)} of ${r.name} — only ${fmtQty(r.returnableQty)} returnable`;
        }
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
      const { items, amountPaisas } = result;

      const maxNo = await getMaxReturnBillNo();
      const billNo = nextReturnBillNo(maxNo ? [{ billNo: maxNo }] : []);
      const status = computeReturnBillStatus(ctx.session.user.role === "admin");

      const { bill } = await createReturnBillTx({
        billNo,
        customerId: customer.id,
        date: input.date,
        status,
        note: input.note?.trim() ? input.note.trim() : null,
        amountPaisas,
        items,
        createdBy: ctx.session.user.id,
      });

      return { billId: bill.id, billNo: bill.billNo };
    }),

  /** Approve a `pending_approval` return bill (admin only): settles it and reduces the customer's outstanding. */
  approve: adminProcedure
    .input(z.object({ billId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const result = await approveReturnBillTx(
        input.billId,
        ctx.session.user.id,
      );
      if (!result.ok) {
        throw new TRPCError({
          code: result.error === "not-found" ? "NOT_FOUND" : "BAD_REQUEST",
          message:
            result.error === "not-found"
              ? "Return bill not found"
              : "Return bill is not pending approval",
        });
      }
    }),

  /** Reject a `pending_approval` return bill (admin only): marks it rejected and reverses the restock. */
  reject: adminProcedure
    .input(
      z.object({
        billId: z.number().int().positive(),
        reason: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await rejectReturnBillTx(
          input.billId,
          ctx.session.user.id,
          input.reason,
        );
        if (!result.ok) {
          throw new TRPCError({
            code: result.error === "not-found" ? "NOT_FOUND" : "BAD_REQUEST",
            message:
              result.error === "not-found"
                ? "Return bill not found"
                : "Return bill is not pending approval",
          });
        }
      } catch (error) {
        // The restocked qty moved elsewhere (sold/transferred) before rejection.
        if (error instanceof InsufficientStockError) {
          const detail = error.shortages
            .map(
              (s) =>
                `${s.articleNumber} (need ${s.requested}, have ${s.available})`,
            )
            .join("; ");
          throw new TRPCError({
            code: "CONFLICT",
            message: `Cannot reject — stock has since moved: ${detail}`,
          });
        }
        throw error;
      }
    }),

  /** Count of return bills awaiting admin approval (admin only, for the nav badge). */
  pendingCount: adminProcedure.query(async () => {
    const count = await getPendingReturnBillsCount();
    return { count };
  }),

  /** Per-customer pending-return-bill counts (admin only). */
  pendingCountByCustomer: adminProcedure.query(() =>
    getPendingReturnBillCountByCustomer(),
  ),
});
