import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { users } from "./users";

/** Whether a bill sends goods out (a sale) or takes them back (a return/credit note). */
export const BILL_DIRECTIONS = ["sale", "return"] as const;
export type BillDirection = (typeof BILL_DIRECTIONS)[number];

export const bills = pgTable(
  "bill",
  {
    id: serial("id").primaryKey(),
    billNo: text("bill_no").unique().notNull(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    date: date("date", { mode: "string" }).notNull(),
    // "sale" (default) sends stock out; "return" brings it back as a credit note.
    direction: text("direction").notNull().default("sale"),
    type: text("type").notNull(),
    status: text("status").notNull(),
    note: text("note"),
    amountPaisas: bigint("amount_paisas", { mode: "bigint" }).notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    approvedBy: text("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    rejectReason: text("reject_reason"),
  },
  (t) => [
    index("bill_customer_idx").on(t.customerId),
    index("bill_status_direction_idx").on(t.status, t.direction),
  ],
);

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
