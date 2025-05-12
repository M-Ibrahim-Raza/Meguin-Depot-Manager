import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { products } from "./products";

/**
 * Cached, live quantity-on-hand per product, split across the two storage
 * locations (warehouse + office). One row per product (created alongside the
 * product). The authoritative history lives in `stockMovements`; these columns
 * are the O(1) cache kept in lock-step inside the same transaction — the same
 * pattern as `customers.outstandingPaisas`. The total on-hand is derived
 * (`warehouseQty + officeQty`) in reads, never stored separately.
 */
export const stock = pgTable("stock", {
  articleNumber: text("article_number")
    .primaryKey()
    .references(() => products.articleNumber, { onDelete: "cascade" }),
  warehouseQty: numeric("warehouse_qty", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  officeQty: numeric("office_qty", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  // Optional low-stock threshold, compared against total on-hand. null = no alert.
  reorderLevel: numeric("reorder_level", { precision: 12, scale: 3 }),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type Stock = typeof stock.$inferSelect;
export type NewStock = typeof stock.$inferInsert;
