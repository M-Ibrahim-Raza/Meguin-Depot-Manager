import {
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/** Admin actions on a user account, recorded by `users.repo.ts`. */
export const USER_AUDIT_ACTIONS = [
  "created",
  "updated",
  "deactivated",
  "reactivated",
  "password_reset",
] as const;
export type UserAuditAction = (typeof USER_AUDIT_ACTIONS)[number];

/**
 * Append-only log of admin actions on user accounts — who did what to whom,
 * and when. Written in the same transaction as the mutation it records.
 */
export const userAuditLog = pgTable(
  "user_audit_log",
  {
    id: serial("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // UserAuditAction
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("user_audit_log_target_idx").on(t.targetUserId, t.createdAt)],
);

export type UserAuditLog = typeof userAuditLog.$inferSelect;
export type NewUserAuditLog = typeof userAuditLog.$inferInsert;
