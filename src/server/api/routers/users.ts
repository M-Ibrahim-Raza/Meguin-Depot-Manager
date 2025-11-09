import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createUserSchema,
  resetPasswordSchema,
  setUserActiveSchema,
  updateUserSchema,
} from "@/features/users/schemas";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  createUserWithAudit,
  getUserAuditLog,
  listUsers,
  resetUserPasswordWithAudit,
  setUserActiveWithAudit,
  updateUserWithAudit,
} from "@/server/db/repos/users.repo";

const BCRYPT_COST = 10;

/**
 * User management API — admin-only. Self-lockout checks (can't demote or
 * deactivate your own account) run here, before the repo is called, since
 * only the router has `ctx.session.user.id`.
 */
export const usersRouter = createTRPCRouter({
  /** All users, sorted by name. */
  list: adminProcedure.query(() => listUsers()),

  /** Admin-action history for one user, most recent first. */
  auditLog: adminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(({ input }) => getUserAuditLog(input.userId)),

  /** Create a user with a password set directly by the admin. */
  create: adminProcedure
    .input(createUserSchema)
    .mutation(async ({ ctx, input }) => {
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
      const result = await createUserWithAudit({
        actorId: ctx.session.user.id,
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash,
      });
      if (!result.ok) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }
      return { id: result.user.id };
    }),

  /** Update name/email/role; an admin cannot demote themselves. */
  update: adminProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role away from admin",
        });
      }
      const result = await updateUserWithAudit({
        actorId: ctx.session.user.id,
        id: input.id,
        name: input.name,
        email: input.email,
        role: input.role,
      });
      if (!result.ok) {
        throw new TRPCError({
          code: result.error === "not-found" ? "NOT_FOUND" : "CONFLICT",
          message:
            result.error === "not-found"
              ? "User not found"
              : "A user with this email already exists",
        });
      }
      return { id: result.user.id };
    }),

  /** Deactivate/reactivate a user; an admin cannot deactivate themselves. */
  setActive: adminProcedure
    .input(setUserActiveSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id && !input.isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot deactivate your own account",
        });
      }
      const result = await setUserActiveWithAudit({
        actorId: ctx.session.user.id,
        id: input.id,
        isActive: input.isActive,
      });
      if (!result.ok) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      return { id: result.user.id };
    }),

  /** Set a new password for a user, chosen directly by the admin. */
  resetPassword: adminProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
      const result = await resetUserPasswordWithAudit({
        actorId: ctx.session.user.id,
        id: input.id,
        passwordHash,
      });
      if (!result.ok) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      return { ok: true as const };
    }),
});
