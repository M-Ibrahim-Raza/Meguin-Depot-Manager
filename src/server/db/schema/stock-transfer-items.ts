import { integer, numeric, pgTable, serial, text } from "drizzle-orm/pg-core";
import { products } from "./products";
import { stockTransfers } from "./stock-transfers";

/**
 * One product line on a transfer slip. Snapshots name/unit at transfer time
 * (history is immutable even if the product later changes). Deliberately has
 * NO price — a transfer relocates stock, it has no monetary value.
 */
export const stockTransferItems = pgTable("stock_transfer_item", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id")
    .notNull()
    .references(() => stockTransfers.id, { onDelete: "cascade" }),
  articleNumber: text("article_number")
    .notNull()
    .references(() => products.articleNumber, { onDelete: "restrict" }),
  nameSnapshot: text("name_snapshot").notNull(),
  unitSnapshot: text("unit_snapshot").notNull(),
  qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
});

export type StockTransferItem = typeof stockTransferItems.$inferSelect;
export type NewStockTransferItem = typeof stockTransferItems.$inferInsert;
