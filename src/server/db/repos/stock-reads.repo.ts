import { and, asc, desc, eq, gte, lt, lte } from "drizzle-orm";
import { addQty, toQty } from "@/features/stock/lib";
import type { StockLocation } from "@/lib/constants";
import { db } from "@/server/db/client";
import {
  bills,
  products,
  stock,
  stockMovements,
  users,
  type StockMovement,
  type StockMovementKind,
} from "@/server/db/schema";

// ---------------------------------------------------------------------------
// Reads — projections for lists, per-product history, and the activity log.
// ---------------------------------------------------------------------------

export type StockListRow = {
  articleNumber: string;
  name: string;
  unit: string;
  category: string;
  active: boolean;
  warehouseQty: number;
  officeQty: number;
  /** Derived total across both locations (warehouseQty + officeQty). */
  quantityOnHand: number;
  reorderLevel: number | null;
  updatedAt: Date | null;
};

/** Every product with its live per-location on-hand and reorder level. */
export async function listStockWithProduct(): Promise<StockListRow[]> {
  const rows = await db
    .select({
      articleNumber: products.articleNumber,
      name: products.name,
      unit: products.unit,
      category: products.category,
      active: products.active,
      warehouseQty: stock.warehouseQty,
      officeQty: stock.officeQty,
      reorderLevel: stock.reorderLevel,
      updatedAt: stock.updatedAt,
    })
    .from(products)
    .leftJoin(stock, eq(stock.articleNumber, products.articleNumber))
    .orderBy(asc(products.name));

  return rows.map((r) => {
    const warehouseQty = toQty(r.warehouseQty);
    const officeQty = toQty(r.officeQty);
    return {
      articleNumber: r.articleNumber,
      name: r.name,
      unit: r.unit,
      category: r.category,
      active: r.active,
      warehouseQty,
      officeQty,
      quantityOnHand: addQty(warehouseQty, officeQty),
      reorderLevel: r.reorderLevel == null ? null : toQty(r.reorderLevel),
      updatedAt: r.updatedAt,
    };
  });
}

export type StockMovementRow = StockMovement & {
  billNo: string | null;
  billCustomerId: number | null;
  createdByName: string | null;
};

/** Full movement timeline for one product (newest first), with bill links + author. */
export async function getStockMovementsByArticle(
  articleNumber: string,
): Promise<StockMovementRow[]> {
  const rows = await db
    .select({
      movement: stockMovements,
      billNo: bills.billNo,
      billCustomerId: bills.customerId,
      createdByName: users.name,
    })
    .from(stockMovements)
    .leftJoin(bills, eq(bills.id, stockMovements.billId))
    .leftJoin(users, eq(users.id, stockMovements.createdBy))
    .where(eq(stockMovements.articleNumber, articleNumber))
    .orderBy(desc(stockMovements.id));
  return rows.map((r) => ({
    ...r.movement,
    billNo: r.billNo,
    billCustomerId: r.billCustomerId,
    createdByName: r.createdByName,
  }));
}

export type StockMovementListRow = StockMovementRow & { name: string };

/** One page of the activity log plus the cursor for the next page (`null` at end). */
export type StockMovementPage = {
  items: StockMovementListRow[];
  nextCursor: number | null;
};

export const DEFAULT_MOVEMENTS_PAGE_SIZE = 50;

type MovementFilters = {
  kind?: StockMovementKind;
  location?: StockLocation;
  articleNumber?: string;
  from?: Date;
  to?: Date;
};

/**
 * The WHERE-condition builder shared by the paginated activity log and its
 * unpaginated export counterpart, so the two never drift apart.
 */
function movementConditions(filters: MovementFilters) {
  const conds = [];
  if (filters.kind) conds.push(eq(stockMovements.kind, filters.kind));
  if (filters.location) {
    conds.push(eq(stockMovements.location, filters.location));
  }
  if (filters.articleNumber) {
    conds.push(eq(stockMovements.articleNumber, filters.articleNumber));
  }
  if (filters.from) conds.push(gte(stockMovements.createdAt, filters.from));
  if (filters.to) conds.push(lte(stockMovements.createdAt, filters.to));
  return conds;
}

/**
 * One cursor-paginated page of the global activity log (newest first), filtered
 * by date range / kind / location / article. `from`/`to` are concrete instants
 * (resolved upstream from a calendar range in {@link APP_TIMEZONE}). Ordering by
 * `id desc` is chronological — `id` is a monotonic serial — so a single-column
 * `id` cursor is stable and the date range only narrows the `WHERE`.
 */
export async function listStockMovements(
  filters: MovementFilters & { cursor?: number; limit?: number },
): Promise<StockMovementPage> {
  const limit = filters.limit ?? DEFAULT_MOVEMENTS_PAGE_SIZE;
  const conds = movementConditions(filters);
  if (filters.cursor) conds.push(lt(stockMovements.id, filters.cursor));

  // Fetch one extra row to detect whether a further page exists.
  const rows = await db
    .select({
      movement: stockMovements,
      billNo: bills.billNo,
      billCustomerId: bills.customerId,
      createdByName: users.name,
      name: products.name,
    })
    .from(stockMovements)
    .leftJoin(bills, eq(bills.id, stockMovements.billId))
    .leftJoin(users, eq(users.id, stockMovements.createdBy))
    .innerJoin(
      products,
      eq(products.articleNumber, stockMovements.articleNumber),
    )
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(stockMovements.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items = page.map((r) => ({
    ...r.movement,
    billNo: r.billNo,
    billCustomerId: r.billCustomerId,
    createdByName: r.createdByName,
    name: r.name,
  }));
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return { items, nextCursor };
}

/**
 * Every movement matching the filters, no pagination — for export only. Shares
 * {@link movementConditions} with {@link listStockMovements} so the two stay in
 * sync; unlike bills/payments/customers export, this filters in SQL rather than
 * in memory because the ledger is append-only and unbounded.
 */
export async function listAllStockMovements(
  filters: MovementFilters,
): Promise<StockMovementListRow[]> {
  const conds = movementConditions(filters);
  const rows = await db
    .select({
      movement: stockMovements,
      billNo: bills.billNo,
      billCustomerId: bills.customerId,
      createdByName: users.name,
      name: products.name,
    })
    .from(stockMovements)
    .leftJoin(bills, eq(bills.id, stockMovements.billId))
    .leftJoin(users, eq(users.id, stockMovements.createdBy))
    .innerJoin(
      products,
      eq(products.articleNumber, stockMovements.articleNumber),
    )
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(stockMovements.id));

  return rows.map((r) => ({
    ...r.movement,
    billNo: r.billNo,
    billCustomerId: r.billCustomerId,
    createdByName: r.createdByName,
    name: r.name,
  }));
}
