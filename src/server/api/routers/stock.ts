import { TRPCError } from "@trpc/server";
import {
  addStockSchema,
  adjustStockSchema,
  movementsByArticleSchema,
  movementsQuerySchema,
  setOpeningSchema,
  setReorderLevelSchema,
} from "@/features/stock/schemas";
import { resolveRange } from "@/lib/date-range";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  addStockTx,
  adjustStockTx,
  getStockMovementsByArticle,
  listStockMovements,
  listStockWithProduct,
  OpeningAlreadySetError,
  setOpeningStockTx,
  setReorderLevelTx,
} from "@/server/db/repos/stock.repo";

const OPENING_ALREADY_SET_ERROR = new TRPCError({
  code: "CONFLICT",
  message: "Opening stock has already been set for this product",
});

/**
 * Stock API. Reads are open to any signed-in user (`protectedProcedure`); all
 * mutations are admin-only (`adminProcedure`). Every on-hand change goes through the
 * append-only `stock_movement` ledger keyed by `location` (`warehouse`/`office`) —
 * stock lives in two locations (`warehouseQty` + `officeQty`), the total is derived,
 * never stored. See docs/adr/0005-stock-movement-ledger.md and
 * docs/adr/0008-stock-locations-and-transfers.md.
 */
export const stockRouter = createTRPCRouter({
  // ---- Reads: any signed-in user ----
  /** Every product with its live per-location on-hand, derived total, and reorder level. */
  list: protectedProcedure.query(() => listStockWithProduct()),

  /** Full movement timeline for one product (newest first), with bill links + author. */
  movementsByArticle: protectedProcedure
    .input(movementsByArticleSchema)
    .query(({ input }) => getStockMovementsByArticle(input.articleNumber)),

  /**
   * One cursor-paginated page of the global movement log (newest first),
   * filterable by date range / kind / location. The date `range` preset (or
   * `custom` from/to) is resolved here to concrete `created_at` instants in the
   * depot timezone, so the boundary math lives in exactly one place.
   */
  movements: protectedProcedure
    .input(movementsQuerySchema)
    .query(({ input }) => {
      const { from, to } = resolveRange(
        { range: input.range, from: input.from, to: input.to },
        new Date(),
      );
      return listStockMovements({
        kind: input.kind,
        location: input.location,
        articleNumber: input.articleNumber,
        from,
        to,
        cursor: input.cursor,
        limit: input.limit,
      });
    }),

  // ---- Mutations: admin only ----
  /**
   * Set the one-time opening baseline for a location (admin only); appends an `opening`
   * movement. 409 if that location was already opened for the product.
   */
  setOpening: adminProcedure
    .input(setOpeningSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { balanceAfter } = await setOpeningStockTx({
          articleNumber: input.articleNumber,
          location: input.location,
          qty: input.qty,
          createdBy: ctx.session.user.id,
        });
        return { balanceAfter };
      } catch (error) {
        if (error instanceof OpeningAlreadySetError) {
          throw OPENING_ALREADY_SET_ERROR;
        }
        throw error;
      }
    }),

  /** Restock a location by a positive amount (admin only); appends an `addition` movement. */
  add: adminProcedure.input(addStockSchema).mutation(async ({ input, ctx }) => {
    const { balanceAfter } = await addStockTx({
      articleNumber: input.articleNumber,
      location: input.location,
      qty: input.qty,
      note: input.note ?? null,
      createdBy: ctx.session.user.id,
    });
    return { balanceAfter };
  }),

  /**
   * Correct a location's on-hand to a counted value (admin only; reason required);
   * appends an `adjustment` movement for the signed difference.
   */
  adjust: adminProcedure
    .input(adjustStockSchema)
    .mutation(async ({ input, ctx }) => {
      const { balanceAfter } = await adjustStockTx({
        articleNumber: input.articleNumber,
        location: input.location,
        counted: input.counted,
        note: input.note,
        createdBy: ctx.session.user.id,
      });
      return { balanceAfter };
    }),

  /** Set or clear the low-stock threshold (admin only). Config only — records no movement. */
  setReorderLevel: adminProcedure
    .input(setReorderLevelSchema)
    .mutation(async ({ input }) => {
      await setReorderLevelTx({
        articleNumber: input.articleNumber,
        reorderLevel: input.reorderLevel,
      });
      return { articleNumber: input.articleNumber };
    }),
});
