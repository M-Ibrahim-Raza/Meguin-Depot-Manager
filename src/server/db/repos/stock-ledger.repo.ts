import { asc, eq, inArray } from "drizzle-orm";
import { addQty, toQty } from "@/features/stock/lib";
import type { StockLocation } from "@/lib/constants";
import { db } from "@/server/db/client";
import {
  stock,
  stockMovements,
  type StockMovementKind,
} from "@/server/db/schema";

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ---------------------------------------------------------------------------
// Typed errors (mapped to TRPCErrors at the router boundary)
// ---------------------------------------------------------------------------

export type StockShortage = {
  articleNumber: string;
  location: StockLocation;
  available: number;
  requested: number;
};

/** Thrown when a deduction would push on-hand below zero without an override. */
export class InsufficientStockError extends Error {
  constructor(public readonly shortages: StockShortage[]) {
    super("Insufficient stock");
    this.name = "InsufficientStockError";
  }
}

// ---------------------------------------------------------------------------
// The single source of truth for changing on-hand quantity
//
// Deadlock safety: any path that locks more than one stock row (the bill deduct
// and restock helpers below) does so in a deterministic order — sorted by
// articleNumber — so concurrent transactions always acquire locks in the same
// order and cannot deadlock.
// ---------------------------------------------------------------------------

type ApplyMovementInput = {
  articleNumber: string;
  /** Which storage location's on-hand this movement changes. */
  location: StockLocation;
  kind: StockMovementKind;
  /** Signed change: positive for opening/addition, negative for sale. */
  qtyDelta: number;
  billId?: number | null;
  transferId?: number | null;
  note?: string | null;
  createdBy?: string | null;
  /** Permit the result to go negative (admin override / pre-validated batch). */
  allowNegative?: boolean;
};

/**
 * The ONLY place on-hand quantity ever changes. Locks the product's stock row
 * (a single row holds both location columns, so the lock serializes warehouse
 * and office movements for that product), reads the targeted location's column,
 * computes the new balance, enforces non-negative (unless `allowNegative`),
 * updates that column, and appends the ledger row — all on the supplied
 * transaction so it composes with bill creation, transfers, and manual ops.
 */
export async function applyStockMovementTx(
  tx: DbTx,
  input: ApplyMovementInput,
): Promise<{ balanceAfter: number }> {
  const [row] = await tx
    .select()
    .from(stock)
    .where(eq(stock.articleNumber, input.articleNumber))
    .for("update");
  if (!row) {
    throw new Error(`No stock row for product ${input.articleNumber}`);
  }

  const current = toQty(
    input.location === "warehouse" ? row.warehouseQty : row.officeQty,
  );
  const next = addQty(current, input.qtyDelta);
  if (next < 0 && !input.allowNegative) {
    throw new InsufficientStockError([
      {
        articleNumber: input.articleNumber,
        location: input.location,
        available: current,
        requested: -input.qtyDelta,
      },
    ]);
  }

  const qtyColumn =
    input.location === "warehouse"
      ? { warehouseQty: next.toString() }
      : { officeQty: next.toString() };
  await tx
    .update(stock)
    .set({ ...qtyColumn, updatedAt: new Date() })
    .where(eq(stock.articleNumber, input.articleNumber));

  await tx.insert(stockMovements).values({
    articleNumber: input.articleNumber,
    kind: input.kind,
    location: input.location,
    qtyDelta: input.qtyDelta.toString(),
    balanceAfter: next.toString(),
    billId: input.billId ?? null,
    transferId: input.transferId ?? null,
    note: input.note ?? null,
    createdBy: input.createdBy ?? null,
  });

  return { balanceAfter: next };
}

export type BillStockLine = {
  articleNumber: string;
  location: StockLocation;
  qty: number;
};

/**
 * Deduct stock for every line of a bill, inside the bill's own transaction.
 * Locks all affected rows up front in a deterministic order (deadlock-safe for
 * concurrent bills) and validates every line first so an error reports all
 * shortages at once. When `allowNegative` (admin override) is set, it skips the
 * block and lets the on-hand go negative — recorded as a flagged `sale`.
 */
export async function deductStockForBillTx(
  tx: DbTx,
  params: {
    items: BillStockLine[];
    billId: number;
    createdBy?: string | null;
    allowNegative?: boolean;
  },
): Promise<void> {
  const { items, billId, createdBy, allowNegative } = params;
  if (items.length === 0) return;

  const articles = [...new Set(items.map((i) => i.articleNumber))].sort();
  const rows = await tx
    .select()
    .from(stock)
    .where(inArray(stock.articleNumber, articles))
    .orderBy(asc(stock.articleNumber))
    .for("update");
  const byArticle = new Map(rows.map((r) => [r.articleNumber, r]));

  if (!allowNegative) {
    // Sum requested qty per (article, location) so two lines drawing from the
    // same place are validated against that location's single balance.
    const requested = new Map<string, number>();
    for (const item of items) {
      const key = `${item.articleNumber}::${item.location}`;
      requested.set(key, addQty(requested.get(key) ?? 0, item.qty));
    }
    const shortages: StockShortage[] = [];
    for (const [key, req] of requested) {
      const sep = key.lastIndexOf("::");
      const articleNumber = key.slice(0, sep);
      const location = key.slice(sep + 2) as StockLocation;
      const row = byArticle.get(articleNumber);
      const available = toQty(
        location === "warehouse" ? row?.warehouseQty : row?.officeQty,
      );
      if (addQty(available, -req) < 0) {
        shortages.push({ articleNumber, location, available, requested: req });
      }
    }
    if (shortages.length > 0) throw new InsufficientStockError(shortages);
  }

  for (const item of items) {
    await applyStockMovementTx(tx, {
      articleNumber: item.articleNumber,
      location: item.location,
      kind: "sale",
      qtyDelta: -item.qty,
      billId,
      createdBy,
      allowNegative: true, // validated above (or explicitly overridden)
    });
  }
}

/**
 * Add stock back for every line of a return bill, inside the return's own
 * transaction. Locks the affected rows up front in a deterministic order (same
 * deadlock-safe ordering as the sale path) and appends a `return` movement per
 * line. No shortage check — adding stock can never push on-hand below zero.
 */
export async function restockForReturnBillTx(
  tx: DbTx,
  params: {
    items: BillStockLine[];
    billId: number;
    createdBy?: string | null;
  },
): Promise<void> {
  const { items, billId, createdBy } = params;
  if (items.length === 0) return;

  const articles = [...new Set(items.map((i) => i.articleNumber))].sort();
  await tx
    .select({ articleNumber: stock.articleNumber })
    .from(stock)
    .where(inArray(stock.articleNumber, articles))
    .orderBy(asc(stock.articleNumber))
    .for("update");

  for (const item of items) {
    await applyStockMovementTx(tx, {
      articleNumber: item.articleNumber,
      location: item.location,
      kind: "return",
      qtyDelta: item.qty,
      billId,
      createdBy,
    });
  }
}
