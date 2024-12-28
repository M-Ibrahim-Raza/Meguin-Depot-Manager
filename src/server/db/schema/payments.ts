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

export const payments = pgTable(
  "payment",
  {
    id: serial("id").primaryKey(),
    payId: text("pay_id").unique().notNull(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    date: date("date", { mode: "string" }).notNull(),
    amountPaisas: bigint("amount_paisas", { mode: "bigint" }).notNull(),
    method: text("method").notNull(),
    note: text("note"),
    approval: text("approval").notNull().default("pending"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    rejectReason: text("reject_reason"),
    adminRemark: text("admin_remark"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("payment_customer_idx").on(t.customerId),
    index("payment_approval_idx").on(t.approval),
  ],
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
