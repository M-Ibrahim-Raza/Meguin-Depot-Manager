import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTransferSchema } from "@/features/stock-transfers/schemas";
import { fmtQty } from "@/features/stock/lib";
import { STOCK_LOCATION_LABELS } from "@/lib/constants";
import { nextTransferNo } from "@/lib/format";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { listProducts } from "@/server/db/repos/products.repo";
import {
  createTransferTx,
  getMaxTransferNo,
  getTransferById,
  listTransfers,
} from "@/server/db/repos/stock-transfers.repo";
import { InsufficientStockError } from "@/server/db/repos/stock.repo";

/**
 * Stock-transfer API. Every procedure is open to any signed-in user
 * (`protectedProcedure`) — both user and admin may move stock, since a transfer is
 * net-zero to total on-hand and fully audited by its slip + ledger legs, so it needs
 * no admin approval. A transfer is an immutable warehouse↔office slip (`T-<n>`) with no
 * money amount; correct a mistake with a reverse transfer. See
 * docs/adr/0008-stock-locations-and-transfers.md.
 */
export const stockTransfersRouter = createTRPCRouter({
  // ---- Reads: any signed-in user ----
  /** Every transfer, newest first, with creator name and a line/qty summary. */
  list: protectedProcedure.query(() => listTransfers()),

  /** One transfer with its line items and creator name (for the printable slip); 404 if not found. */
  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const result = await getTransferById(input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer not found",
        });
      }
      return result;
    }),

  /** Preview the next slip number (`T-NNN`) for the create form. */
  nextNoPreview: protectedProcedure.query(async () => {
    const maxNo = await getMaxTransferNo();
    return nextTransferNo(maxNo ? [{ slipNo: maxNo }] : []);
  }),

  // ---- Mutation: user OR admin (a transfer is net-zero to total stock) ----
  /**
   * Record a warehouse↔office transfer (user or admin): validates products and rejects
   * duplicate lines, allocates the next `T-NNN`, then atomically writes the immutable
   * slip + items and posts the paired `transfer_out`/`transfer_in` ledger legs. 409 if
   * the source location lacks enough stock (no override).
   */
  create: protectedProcedure
    .input(createTransferSchema)
    .mutation(async ({ input, ctx }) => {
      const products = await listProducts();
      const productMap = new Map(products.map((p) => [p.articleNumber, p]));

      const seen = new Set<string>();
      for (const it of input.items) {
        if (!productMap.has(it.articleNumber)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Product ${it.articleNumber} not found`,
          });
        }
        if (seen.has(it.articleNumber)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Duplicate product line",
          });
        }
        seen.add(it.articleNumber);
      }

      const snapshotItems = input.items.map((it) => {
        const product = productMap.get(it.articleNumber)!;
        return {
          articleNumber: product.articleNumber,
          nameSnapshot: product.name,
          unitSnapshot: product.unit,
          qty: it.qty,
        };
      });

      const maxNo = await getMaxTransferNo();
      const slipNo = nextTransferNo(maxNo ? [{ slipNo: maxNo }] : []);

      try {
        const { transferId, slipNo: created } = await createTransferTx({
          slipNo,
          fromLocation: input.fromLocation,
          toLocation: input.toLocation,
          date: input.date,
          note: input.note?.trim() ? input.note.trim() : null,
          items: snapshotItems,
          createdBy: ctx.session.user.id,
        });
        return { transferId, slipNo: created };
      } catch (error) {
        if (error instanceof InsufficientStockError) {
          const where = STOCK_LOCATION_LABELS[input.fromLocation];
          const detail = error.shortages
            .map((s) => {
              const name =
                productMap.get(s.articleNumber)?.name ?? s.articleNumber;
              return `${name} (need ${fmtQty(s.requested)}, have ${fmtQty(s.available)} in ${where})`;
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
});
