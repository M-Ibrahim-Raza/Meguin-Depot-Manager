import {
  bigint,
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

export const billItems = pgTable(
  "bill_item",
  {
    id: serial("id").primaryKey(),
    billId: integer("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    articleNumber: text("article_number")
      .notNull()
      .references(() => products.articleNumber, { onDelete: "restrict" }),
    nameSnapshot: text("name_snapshot").notNull(),
    unitSnapshot: text("unit_snapshot").notNull(),
    // Which storage location this line's stock was drawn from (a StockLocation).
    // Defaults to warehouse so pre-location bills backfill consistently.
    sourceLocation: text("source_location").notNull().default("warehouse"),
    unitPricePaisas: bigint("unit_price_paisas", {
      mode: "bigint",
    }).notNull(),
    // The product's catalogue price at sale time, distinct from unitPricePaisas
    // (what was actually charged) when the line was sold above list (upsell).
    // Null only for rows created before this column existed.
    basePricePaisas: bigint("base_price_paisas", { mode: "bigint" }),
    qty: numeric("qty", { precision: 12, scale: 3 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("bill_item_bill_idx").on(t.billId)],
);

export type BillItem = typeof billItems.$inferSelect;
export type NewBillItem = typeof billItems.$inferInsert;
