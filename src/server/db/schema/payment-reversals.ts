import {
  bigint,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { customers } from "./customers";
import { payments } from "./payments";
import { users } from "./users";

/** A reversal request's own lifecycle — independent of the parent payment's approval. */
export const PAYMENT_REVERSAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export type PaymentReversalStatus = (typeof PAYMENT_REVERSAL_STATUSES)[number];

/**
 * A request to undo part or all of an already-approved payment (e.g. the client
 * overpaid by mistake). A payment may have many reversals over time; the sum of
 * `approved` ones can never exceed the payment's own `amountPaisas`. Only approval
 * moves `customers.outstandingPaisas` (by `+amountPaisas`) — request and rejection
 * never touch it. See docs/adr/0009-payment-reversal-requests.md.
 */
export const paymentReversals = pgTable(
  "payment_reversal",
  {
    id: serial("id").primaryKey(),
    reversalNo: text("reversal_no").unique().notNull(),
    paymentId: integer("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    // Denormalized from the payment so the admin queue and per-customer views
    // don't need a join, mirroring stock_movement.articleNumber.
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    // Positive magnitude being reversed (may be less than the payment's amount).
    amountPaisas: bigint("amount_paisas", { mode: "bigint" }).notNull(),
    status: text("status").notNull().default("pending"),
    reason: text("reason").notNull(),
    requestedBy: text("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    requestedAt: timestamp("requested_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    // Display name of the admin who decided — matches payments.approvedBy.
    approvedBy: text("approved_by"),
    // Set on approve AND reject, matching payments/rejectPaymentTx.
    approvedAt: timestamp("approved_at", { mode: "date" }),
    rejectReason: text("reject_reason"),
  },
  (t) => [
    index("payment_reversal_payment_idx").on(t.paymentId),
    index("payment_reversal_status_idx").on(t.status),
    index("payment_reversal_customer_idx").on(t.customerId),
  ],
);

export type PaymentReversal = typeof paymentReversals.$inferSelect;
export type NewPaymentReversal = typeof paymentReversals.$inferInsert;
