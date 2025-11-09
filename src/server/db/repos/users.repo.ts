import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  users,
  userAuditLog,
  type User,
  type UserAuditLog,
} from "@/server/db/schema";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

export async function listUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(asc(users.name));
}

export async function getUser(id: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; error: "email-taken" };

export async function createUserWithAudit(input: {
  actorId: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string;
}): Promise<CreateUserResult> {
  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash: input.passwordHash,
        })
        .returning();
      await tx.insert(userAuditLog).values({
        actorUserId: input.actorId,
        targetUserId: user.id,
        action: "created",
        details: { name: input.name, email: input.email, role: input.role },
      });
      return { ok: true, user } as const;
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "email-taken" };
    throw err;
  }
}

export type UpdateUserResult =
  | { ok: true; user: User }
  | { ok: false; error: "not-found" | "email-taken" };

export async function updateUserWithAudit(input: {
  actorId: string;
  id: string;
  name: string;
  email: string;
  role: string;
}): Promise<UpdateUserResult> {
  try {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(users)
        .set({
          name: input.name,
          email: input.email,
          role: input.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.id))
        .returning();
      if (!updated) return { ok: false, error: "not-found" } as const;

      await tx.insert(userAuditLog).values({
        actorUserId: input.actorId,
        targetUserId: input.id,
        action: "updated",
        details: { name: input.name, email: input.email, role: input.role },
      });
      return { ok: true, user: updated } as const;
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "email-taken" };
    throw err;
  }
}

export type SetUserActiveResult =
  | { ok: true; user: User }
  | { ok: false; error: "not-found" };

export async function setUserActiveWithAudit(input: {
  actorId: string;
  id: string;
  isActive: boolean;
}): Promise<SetUserActiveResult> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ isActive: input.isActive, updatedAt: new Date() })
      .where(eq(users.id, input.id))
      .returning();
    if (!updated) return { ok: false, error: "not-found" } as const;

    await tx.insert(userAuditLog).values({
      actorUserId: input.actorId,
      targetUserId: input.id,
      action: input.isActive ? "reactivated" : "deactivated",
    });
    return { ok: true, user: updated } as const;
  });
}

export type ResetUserPasswordResult =
  | { ok: true }
  | { ok: false; error: "not-found" };

export async function resetUserPasswordWithAudit(input: {
  actorId: string;
  id: string;
  passwordHash: string;
}): Promise<ResetUserPasswordResult> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ passwordHash: input.passwordHash, updatedAt: new Date() })
      .where(eq(users.id, input.id))
      .returning();
    if (!updated) return { ok: false, error: "not-found" } as const;

    await tx.insert(userAuditLog).values({
      actorUserId: input.actorId,
      targetUserId: input.id,
      action: "password_reset",
    });
    return { ok: true } as const;
  });
}

export type UserAuditLogEntry = UserAuditLog & { actorName: string | null };

/** A user's admin-action history, most recent first, with the actor's name. */
export async function getUserAuditLog(
  userId: string,
): Promise<UserAuditLogEntry[]> {
  return db
    .select({
      id: userAuditLog.id,
      actorUserId: userAuditLog.actorUserId,
      targetUserId: userAuditLog.targetUserId,
      action: userAuditLog.action,
      details: userAuditLog.details,
      createdAt: userAuditLog.createdAt,
      actorName: users.name,
    })
    .from(userAuditLog)
    .leftJoin(users, eq(userAuditLog.actorUserId, users.id))
    .where(eq(userAuditLog.targetUserId, userId))
    .orderBy(desc(userAuditLog.createdAt));
}
