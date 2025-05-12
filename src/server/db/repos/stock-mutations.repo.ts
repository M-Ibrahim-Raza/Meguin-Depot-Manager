import { and, eq } from "drizzle-orm";
import { addQty, toQty } from "@/features/stock/lib";
import type { StockLocation } from "@/lib/constants";
import { db } from "@/server/db/client";
import { stock, stockMovements } from "@/server/db/schema";
import { applyStockMovementTx } from "./stock-ledger.repo";

// ---------------------------------------------------------------------------
// Manual mutations (admin-only at the router) — each its own transaction.
// Every on-hand change still goes through applyStockMovementTx (the ledger seam).
// ---------------------------------------------------------------------------

/** Thrown when opening stock is set more than once for a product. */
export class OpeningAlreadySetError extends Error {
  constructor() {
    super("Opening stock has already been set for this product");
    this.name = "OpeningAlreadySetError";
  }
}

/**
 * Set the one-time opening baseline for a location. Rejects if any movement
 * already exists at that location (so warehouse and office can each be opened
 * once, independently).
 */
export async function setOpeningStockTx(params: {
  articleNumber: string;
  location: StockLocation;
  qty: number;
  createdBy?: string | null;
}): Promise<{ balanceAfter: number }> {
  return db.transaction(async (tx) => {
    // Lock the stock row first so concurrent openings serialize here, then the
    // second caller sees the first opening movement and is rejected.
    const [row] = await tx
      .select()
      .from(stock)
      .where(eq(stock.articleNumber, params.articleNumber))
      .for("update");
    if (!row) {
      throw new Error(`No stock row for product ${params.articleNumber}`);
    }

    const [existing] = await tx
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.articleNumber, params.articleNumber),
          eq(stockMovements.location, params.location),
        ),
      )
      .limit(1);
    if (existing) throw new OpeningAlreadySetError();

    const current = toQty(
      params.location === "warehouse" ? row.warehouseQty : row.officeQty,
    );
    return applyStockMovementTx(tx, {
      articleNumber: params.articleNumber,
      location: params.location,
      kind: "opening",
      qtyDelta: addQty(params.qty, -current),
      createdBy: params.createdBy,
    });
  });
}

/** Restock a location by a positive amount. */
export async function addStockTx(params: {
  articleNumber: string;
  location: StockLocation;
  qty: number;
  note?: string | null;
  createdBy?: string | null;
}): Promise<{ balanceAfter: number }> {
  return db.transaction((tx) =>
    applyStockMovementTx(tx, {
      articleNumber: params.articleNumber,
      location: params.location,
      kind: "addition",
      qtyDelta: params.qty,
      note: params.note,
      createdBy: params.createdBy,
    }),
  );
}

/** Correct a location's on-hand to a counted value (damage/loss/recount). Note required. */
export async function adjustStockTx(params: {
  articleNumber: string;
  location: StockLocation;
  counted: number;
  note: string;
  createdBy?: string | null;
}): Promise<{ balanceAfter: number }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(stock)
      .where(eq(stock.articleNumber, params.articleNumber))
      .for("update");
    if (!row) {
      throw new Error(`No stock row for product ${params.articleNumber}`);
    }
    const current = toQty(
      params.location === "warehouse" ? row.warehouseQty : row.officeQty,
    );
    const delta = addQty(params.counted, -current);
    return applyStockMovementTx(tx, {
      articleNumber: params.articleNumber,
      location: params.location,
      kind: "adjustment",
      qtyDelta: delta,
      note: params.note,
      createdBy: params.createdBy,
      allowNegative: true, // counted is an absolute ≥ 0, so the result can't be negative
    });
  });
}

/** Set or clear the low-stock threshold. Config only — no movement recorded. */
export async function setReorderLevelTx(params: {
  articleNumber: string;
  reorderLevel: number | null;
}): Promise<void> {
  const [row] = await db
    .update(stock)
    .set({
      reorderLevel:
        params.reorderLevel == null ? null : params.reorderLevel.toString(),
      updatedAt: new Date(),
    })
    .where(eq(stock.articleNumber, params.articleNumber))
    .returning();
  if (!row) {
    throw new Error(`No stock row for product ${params.articleNumber}`);
  }
}
