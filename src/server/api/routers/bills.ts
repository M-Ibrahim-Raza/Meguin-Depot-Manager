import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  calculateBillTotal,
  computeBillStatus,
  findDuplicateLine,
  resolveLineUnitPricePaisas,
  validateUpsellPrices,
} from "@/features/bills/lib";
import { createBillSchema } from "@/features/bills/schemas";
import {
  calculateAvailableByLocation,
  fmtQty,
  validateStockAvailable,
} from "@/features/stock/lib";
import { STOCK_LOCATION_LABELS } from "@/lib/constants";
import { fmtPaisas, nextBillNo } from "@/lib/format";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  approveBillTx,
  createBillTx,
  getBillById,
  getBillStats,
  getMaxBillNo,
  getPendingBillCountByCustomer,
  getPendingBillsCount,
  listAllBills,
  rejectBillTx,
} from "@/server/db/repos/bills.repo";
import { db } from "@/server/db/client";
import { bills } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { getCustomer } from "@/server/db/repos/customers.repo";
import { listProducts } from "@/server/db/repos/products.repo";
import {
  InsufficientStockError,
  listStockWithProduct,
} from "@/server/db/repos/stock.repo";

/**
 * Sale-bill API. Reads and bill creation are open to any signed-in user
 * (`protectedProcedure`); approving/rejecting over-limit bills and the
 * pending-count badge are admin-only (`adminProcedure`). A deferred bill that
 * would push a customer past their credit limit becomes `pending_approval` for
 * a user (no outstanding change yet) but auto-approves for an admin; admin
 * approval flips it to `unpaid` and bumps the customer's outstanding, while
 * rejection restocks the lines. Creating a bill deducts stock under row locks
 * and may throw `InsufficientStockError`. Prices/amounts are `bigint` paisas.
 */
export const billsRouter = createTRPCRouter({
  /** Today/this-month sale counts and totals for the dashboard. */
  stats: protectedProcedure
    .input(z.object({ today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(({ input }) => getBillStats(input.today)),

  /** Preview the next sale bill number (`B-NNN`) without allocating it. */
  nextNoPreview: protectedProcedure.query(async () => {
    const maxBillNo = await getMaxBillNo();
    return nextBillNo(maxBillNo ? [{ billNo: maxBillNo }] : []);
  }),

  /** One bill with customer + line items for the print sheet; 404 unless it belongs to the given customer. */
  byId: protectedProcedure
    .input(
      z.object({
        billId: z.number().int().positive(),
        customerId: z.number().int().positive(),
      }),
    )
    .query(async ({ input }) => {
      const result = await getBillById(input.billId);
      // Collapse "no such bill" and "bill belongs to another customer" into
      // one NOT_FOUND so a mistyped URL can't surface a different customer's bill.
      if (!result || result.bill.customerId !== input.customerId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bill not found" });
      }
      return result;
    }),

  /**
   * Create a sale bill: validates lines and per-location stock, deducts stock
   * atomically, and sets status (cash → `paid`; deferred → `unpaid`). An
   * over-limit deferred bill becomes `pending_approval` for a user (one at a
   * time per customer, no outstanding change yet) but auto-approves for an admin.
   * Only an admin may `override` to sell past available stock.
   */
  create: protectedProcedure
    .input(createBillSchema)
    .mutation(async ({ input, ctx }) => {
      // Only an admin may sell past available stock.
      const override = input.override && ctx.session.user.role === "admin";

      const [customer, products, stockRows] = await Promise.all([
        getCustomer(input.customerId),
        listProducts(),
        listStockWithProduct(),
      ]);

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      const productMap = new Map(products.map((p) => [p.articleNumber, p]));
      for (const item of input.items) {
        if (!productMap.has(item.articleNumber)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Product ${item.articleNumber} not found`,
          });
        }
      }
      // A product may appear once per location (some from office, some from
      // warehouse); reject a repeated (article, location) pair.
      if (findDuplicateLine(input.items)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Duplicate product line for the same location",
        });
      }

      // A line may be sold above the product's catalogue price, never below.
      // The client's own price field already clamps to this floor, but the
      // server re-checks in case the catalogue price changed since the form
      // loaded (mirrors the stock shortage re-check below).
      const upsellIssues = validateUpsellPrices(input.items, productMap);
      if (upsellIssues.length > 0) {
        const detail = upsellIssues
          .map((issue) => {
            const name =
              productMap.get(issue.articleNumber)?.name ?? issue.articleNumber;
            return `${name} (entered ${fmtPaisas(issue.enteredPaisas)}, listed at ${fmtPaisas(issue.listedPaisas)})`;
          })
          .join("; ");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Sale price can't be below the listed price: ${detail}`,
        });
      }

      // Friendly per-location stock pre-check (the transaction re-checks
      // authoritatively under row locks). Skipped when an admin overrides.
      if (!override) {
        const availableByKey = calculateAvailableByLocation(stockRows);
        const shortages = validateStockAvailable(input.items, availableByKey);
        if (shortages.length > 0) {
          const detail = shortages
            .map((s) => {
              const name =
                productMap.get(s.articleNumber)?.name ?? s.articleNumber;
              return `${name} (need ${fmtQty(s.requested)}, have ${fmtQty(s.available)} in ${STOCK_LOCATION_LABELS[s.location]})`;
            })
            .join("; ");
          throw new TRPCError({
            code: "CONFLICT",
            message: `Insufficient stock: ${detail}`,
          });
        }
      }

      const totalPaisas = calculateBillTotal(input.items, productMap);
      const snapshotItems = input.items.map((it) => {
        const product = productMap.get(it.articleNumber)!;
        return {
          articleNumber: product.articleNumber,
          sourceLocation: it.location,
          nameSnapshot: product.name,
          unitSnapshot: product.unit,
          unitPricePaisas: resolveLineUnitPricePaisas(it, product),
          basePricePaisas: product.pricePaisas,
          qty: it.qty.toString(),
        };
      });

      const isAdmin = ctx.session.user.role === "admin";
      const {
        status: billStatus,
        outstandingDeltaPaisas: outstandingDelta,
        overLimit,
      } = computeBillStatus({
        type: input.type,
        totalPaisas,
        outstandingPaisas: customer.outstandingPaisas,
        creditLimitPaisas: customer.creditLimitPaisas,
        isAdmin,
      });

      // A user's over-limit deferred bill needs admin approval, and only one
      // may be pending per customer at a time. Direction-scoped so a pending
      // return bill (a separate approval queue) doesn't block a new sale.
      if (overLimit && !isAdmin) {
        const [existingPending] = await db
          .select()
          .from(bills)
          .where(
            and(
              eq(bills.customerId, customer.id),
              eq(bills.status, "pending_approval"),
              eq(bills.direction, "sale"),
            ),
          )
          .limit(1);

        if (existingPending) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A bill is already pending approval for this customer",
          });
        }
      }

      const maxBillNo = await getMaxBillNo();
      const billNo = nextBillNo(maxBillNo ? [{ billNo: maxBillNo }] : []);

      try {
        const { bill } = await createBillTx({
          billNo,
          customerId: customer.id,
          date: input.date,
          type: input.type,
          status: billStatus,
          note: input.note?.trim() ? input.note.trim() : null,
          amountPaisas: totalPaisas,
          items: snapshotItems,
          outstandingDeltaPaisas: outstandingDelta,
          createdBy: ctx.session.user.id,
          allowNegative: override,
        });

        return { billId: bill.id, billNo: bill.billNo };
      } catch (error) {
        // A concurrent bill drained stock between the pre-check and the commit.
        if (error instanceof InsufficientStockError) {
          const detail = error.shortages
            .map((s) => {
              const name =
                productMap.get(s.articleNumber)?.name ?? s.articleNumber;
              return `${name} (need ${fmtQty(s.requested)}, have ${fmtQty(s.available)} in ${STOCK_LOCATION_LABELS[s.location]})`;
            })
            .join("; ");
          throw new TRPCError({
            code: "CONFLICT",
            message: `Insufficient stock: ${detail}`,
          });
        }
        throw error;
      }
    }),

  /** Approve a `pending_approval` bill (admin only): flips it to `unpaid` and bumps the customer's outstanding. */
  approve: adminProcedure
    .input(z.object({ billId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const result = await approveBillTx(input.billId, ctx.session.user.id);
      if (!result.ok) {
        throw new TRPCError({
          code: result.error === "not-found" ? "NOT_FOUND" : "BAD_REQUEST",
          message:
            result.error === "not-found"
              ? "Bill not found"
              : "Bill is not pending approval",
        });
      }
    }),

  /** Reject a `pending_approval` bill (admin only): marks it `rejected` and restocks each line to its source location. */
  reject: adminProcedure
    .input(
      z.object({
        billId: z.number().int().positive(),
        reason: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await rejectBillTx(
        input.billId,
        ctx.session.user.id,
        input.reason,
      );
      if (!result.ok) {
        throw new TRPCError({
          code: result.error === "not-found" ? "NOT_FOUND" : "BAD_REQUEST",
          message:
            result.error === "not-found"
              ? "Bill not found"
              : "Bill is not pending approval",
        });
      }
    }),

  /** Whether the customer already has a sale bill awaiting approval (gates the bill form). */
  customerHasPending: protectedProcedure
    .input(z.object({ customerId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const [pending] = await db
        .select()
        .from(bills)
        .where(
          and(
            eq(bills.customerId, input.customerId),
            eq(bills.status, "pending_approval"),
            eq(bills.direction, "sale"),
          ),
        )
        .limit(1);
      return { hasPending: !!pending };
    }),

  /** Count of bills awaiting admin approval (admin only, for the nav badge). */
  pendingCount: adminProcedure.query(async () => {
    const count = await getPendingBillsCount();
    return { count };
  }),

  /** Per-customer count of sale bills awaiting approval (for the customers list page). */
  pendingCountByCustomer: protectedProcedure.query(() =>
    getPendingBillCountByCustomer(),
  ),

  /** Every sale + return bill across all customers, for the global Bills page. */
  list: protectedProcedure.query(() => listAllBills()),
});
