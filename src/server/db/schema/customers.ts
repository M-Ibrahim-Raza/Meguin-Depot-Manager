import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const customers = pgTable("customer", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  area: text("area"),
  phone: text("phone"),
  referral: text("referral"),
  creditLimitPaisas: bigint("credit_limit_paisas", {
    mode: "bigint",
  }).notNull(),
  outstandingPaisas: bigint("outstanding_paisas", { mode: "bigint" })
    .notNull()
    .default(sql`0`),
  paymentType: text("payment_type").notNull().default("deferred"),
  lastPaymentDate: date("last_payment_date", { mode: "string" }),
  lastPaymentPaisas: bigint("last_payment_paisas", { mode: "bigint" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
