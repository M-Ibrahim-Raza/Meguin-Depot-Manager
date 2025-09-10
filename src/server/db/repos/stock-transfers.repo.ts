import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { addQty, toQty } from "@/features/stock/lib";
import type { StockLocation } from "@/lib/constants";
import { db } from "@/server/db/client";
import {
  stock,
  stockTransferItems,
  stockTransfers,
  users,
  type StockTransfer,
  type StockTransferItem,
} from "@/server/db/schema";
import {
  applyStockMovementTx,
  InsufficientStockError,
  type StockShortage,
} from "@/server/db/repos/stock.repo";

export type TransferListRow = {
  id: number;
  slipNo: string;
  fromLocation: StockLocation;
  toLocation: StockLocation;
  date: string;
  note: string | null;
  createdByName: string | null;
  createdAt: Date;
  itemCount: number;
  totalQty: number;
};

/** Every transfer, newest first, with creator name and a line/qty summary. */
export async function listTransfers(): Promise<TransferListRow[]> {
  const rows = await db
    .select({
      transfer: stockTransfers,
      createdByName: users.name,
      itemCount: sql<number>`count(${stockTransferItems.id})::int`,
      totalQty: sql<string>`coalesce(sum(${stockTransferItems.qty}), 0)`,
    })
    .from(stockTransfers)
    .leftJoin(users, eq(users.id, stockTransfers.createdBy))
    .leftJoin(
      stockTransferItems,
      eq(stockTransferItems.transferId, stockTransfers.id),
    )
    .groupBy(stockTransfers.id, users.name)
    .orderBy(desc(stockTransfers.date), desc(stockTransfers.id));

  return rows.map((r) => ({
    id: r.transfer.id,
    slipNo: r.transfer.slipNo,
    fromLocation: r.transfer.fromLocation as StockLocation,
    toLocation: r.transfer.toLocation as StockLocation,
    date: r.transfer.date,
    note: r.transfer.note,
    createdByName: r.createdByName,
    createdAt: r.transfer.createdAt,
    itemCount: Number(r.itemCount),
    totalQty: toQty(r.totalQty),
  }));
}

export type TransferWithDetails = {
  transfer: StockTransfer;
  items: StockTransferItem[];
  createdByName: string | null;
};

/** One transfer with its line items and creator name — for the printable slip. */
export async function getTransferById(
  id: number,
): Promise<TransferWithDetails | undefined> {
  const [row] = await db
    .select({ transfer: stockTransfers, createdByName: users.name })
    .from(stockTransfers)
    .leftJoin(users, eq(users.id, stockTransfers.createdBy))
    .where(eq(stockTransfers.id, id))
    .limit(1);
  if (!row) return undefined;

  const items = await db
    .select()
    .from(stockTransferItems)
    .where(eq(stockTransferItems.transferId, id))
    .orderBy(asc(stockTransferItems.id));

  return { transfer: row.transfer, items, createdByName: row.createdByName };
}

/** Highest existing transfer slip number (T-<n>), for the next-number preview. */
export async function getMaxTransferNo(): Promise<string | null> {
  const [row] = await db
    .select({ slipNo: stockTransfers.slipNo })
    .from(stockTransfers)
    .orderBy(
      desc(sql`cast(substring(${stockTransfers.slipNo} from 3) as integer)`),
    )
    .limit(1);
  return row?.slipNo ?? null;
}

export type CreateTransferTxInput = {
  slipNo: string;
  fromLocation: StockLocation;
  toLocation: StockLocation;
  date: string;
  note: string | null;
  items: Array<{
    articleNumber: string;
    nameSnapshot: string;
    unitSnapshot: string;
    qty: number;
  }>;
  createdBy: string | null;
};

/**
 * Record a transfer atomically: validate the source location has enough for
 * every line, insert the slip header + items, then post the two paired ledger
 * legs per line — `transfer_out` from the source, `transfer_in` to the
 * destination — both linked by `transferId`. Net effect on total on-hand is
 * zero. Hard-blocks on insufficient source stock (no override — you can't move
 * stock you don't have).
 */
export async function createTransferTx(
  input: CreateTransferTxInput,
): Promise<{ transferId: number; slipNo: string }> {
  return db.transaction(async (tx) => {
    // Lock affected product rows up front, deterministic order (deadlock-safe).
    const articles = [
      ...new Set(input.items.map((i) => i.articleNumber)),
    ].sort();
    const rows = await tx
      .select()
      .from(stock)
      .where(inArray(stock.articleNumber, articles))
      .orderBy(asc(stock.articleNumber))
      .for("update");
    const byArticle = new Map(rows.map((r) => [r.articleNumber, r]));

    // Validate the source location can cover the aggregated request per article.
    const requested = new Map<string, number>();
    for (const it of input.items) {
      requested.set(
        it.articleNumber,
        addQty(requested.get(it.articleNumber) ?? 0, it.qty),
      );
    }
    const shortages: StockShortage[] = [];
    for (const [articleNumber, req] of requested) {
      const row = byArticle.get(articleNumber);
      const available = toQty(
        input.fromLocation === "warehouse" ? row?.warehouseQty : row?.officeQty,
      );
      if (addQty(available, -req) < 0) {
        shortages.push({
          articleNumber,
          location: input.fromLocation,
          available,
          requested: req,
        });
      }
    }
    if (shortages.length > 0) throw new InsufficientStockError(shortages);

    const [transfer] = await tx
      .insert(stockTransfers)
      .values({
        slipNo: input.slipNo,
        fromLocation: input.fromLocation,
        toLocation: input.toLocation,
        date: input.date,
        note: input.note,
        createdBy: input.createdBy,
      })
      .returning();

    await tx.insert(stockTransferItems).values(
      input.items.map((it) => ({
        transferId: transfer.id,
        articleNumber: it.articleNumber,
        nameSnapshot: it.nameSnapshot,
        unitSnapshot: it.unitSnapshot,
        qty: it.qty.toString(),
      })),
    );

    for (const it of input.items) {
      await applyStockMovementTx(tx, {
        articleNumber: it.articleNumber,
        location: input.fromLocation,
        kind: "transfer_out",
        qtyDelta: -it.qty,
        transferId: transfer.id,
        createdBy: input.createdBy,
        allowNegative: true, // validated above under the row lock
      });
      await applyStockMovementTx(tx, {
        articleNumber: it.articleNumber,
        location: input.toLocation,
        kind: "transfer_in",
        qtyDelta: it.qty,
        transferId: transfer.id,
        createdBy: input.createdBy,
      });
    }

    return { transferId: transfer.id, slipNo: transfer.slipNo };
  });
}
