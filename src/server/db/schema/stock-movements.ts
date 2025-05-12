import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { bills } from "./bills";
import { products } from "./products";
import { stockTransfers } from "./stock-transfers";
import { users } from "./users";

/**
 * Every kind of stock change. `transfer_out`/`transfer_in` are the two paired
 * legs of a stock transfer between locations (see `stockTransfers`).
 */
export const STOCK_MOVEMENT_KINDS = [
  "opening",
  "addition",
  "adjustment",
  "sale",
  "return",
  "transfer_out",
  "transfer_in",
] as const;
export type StockMovementKind = (typeof STOCK_MOVEMENT_KINDS)[number];

/**
 * Append-only ledger of every stock change — the "record of deduction" and the
 * audit trail behind the cached per-location balances on `stock`. Rows are never
 * updated or deleted; corrections are new `adjustment` rows.
 */
export const stockMovements = pgTable(
  "stock_movement",
  {
    id: serial("id").primaryKey(),
    articleNumber: text("article_number")
      .notNull()
      .references(() => products.articleNumber, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // StockMovementKind
    // Which storage location this movement applied to (a StockLocation).
    // Defaults to warehouse so pre-location movements backfill consistently.
    location: text("location").notNull().default("warehouse"),
    // Signed change applied to on-hand: positive for opening/addition, negative for sale.
    qtyDelta: numeric("qty_delta", { precision: 12, scale: 3 }).notNull(),
    // Resulting on-hand at this location after this movement, snapshotted for fast reads.
    balanceAfter: numeric("balance_after", {
      precision: 12,
      scale: 3,
    }).notNull(),
    // Set for `sale`/`return` movements; links back to the bill.
    billId: integer("bill_id").references(() => bills.id, {
      onDelete: "set null",
    }),
    // Set for the paired `transfer_out`/`transfer_in` legs; links back to the slip.
    transferId: integer("transfer_id").references(() => stockTransfers.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("stock_movement_article_idx").on(t.articleNumber, t.createdAt),
    index("stock_movement_bill_idx").on(t.billId),
    index("stock_movement_transfer_idx").on(t.transferId),
    // Serves the global activity log's date-range scans — the composite index
    // above leads with article_number, so it can't bound created_at on its own.
    index("stock_movement_created_at_idx").on(t.createdAt),
  ],
);

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
