import { date, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * A recorded movement of stock between the two storage locations (warehouse ↔
 * office). The header for a transfer slip — carries NO monetary amount. Issued
 * under the creating worker's name (`createdBy`). Immutable: a mistake is
 * corrected by recording a new transfer in the opposite direction. The two
 * paired ledger legs live in `stock_movement` (`transfer_out` / `transfer_in`),
 * linked by `transferId`.
 */
export const stockTransfers = pgTable("stock_transfer", {
  id: serial("id").primaryKey(),
  slipNo: text("slip_no").unique().notNull(), // monotonic `T-<n>` series
  fromLocation: text("from_location").notNull(), // a StockLocation
  toLocation: text("to_location").notNull(), // a StockLocation
  date: date("date", { mode: "string" }).notNull(),
  note: text("note"),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export type StockTransfer = typeof stockTransfers.$inferSelect;
export type NewStockTransfer = typeof stockTransfers.$inferInsert;
