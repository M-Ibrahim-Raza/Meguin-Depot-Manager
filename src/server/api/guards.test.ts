import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";

// The guards never call auth() (the test supplies its own context), so stub the
// module to keep next-auth's `next/server` import out of the vitest graph.
vi.mock("@/server/auth", () => ({ auth: vi.fn(async () => null) }));

import { appRouter } from "@/server/api/root";
import { db } from "@/server/db/client";

// These assertions exercise the auth middleware only — every case short-circuits
// in protectedProcedure/adminProcedure before any repo/DB access runs.

function ctx(session: Session | null) {
  return { session, db };
}

function session(role: string): Session {
  return {
    user: { id: "u1", role, name: "Test", email: "test@example.com" },
    expires: "2999-01-01T00:00:00.000Z",
  };
}

const validProduct = {
  articleNumber: "A-1",
  name: "Test Oil",
  unit: "Litre",
  category: "Engine Oil",
  priceRupees: 100,
};

describe("tRPC auth guards", () => {
  it("rejects anonymous callers on protected queries", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(caller.products.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects anonymous callers on admin-only mutations", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(caller.products.create(validProduct)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects users on admin-only mutations", async () => {
    const caller = appRouter.createCaller(ctx(session("user")));
    await expect(caller.products.create(validProduct)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.products.update(validProduct)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.products.delete({ articleNumber: validProduct.articleNumber }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.payments.approve({ id: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects users on admin-only stock mutations", async () => {
    const caller = appRouter.createCaller(ctx(session("user")));
    await expect(
      caller.stock.setOpening({
        articleNumber: "A-1",
        location: "warehouse",
        qty: 10,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.stock.add({ articleNumber: "A-1", location: "warehouse", qty: 5 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.stock.adjust({
        articleNumber: "A-1",
        location: "warehouse",
        counted: 3,
        note: "recount",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects anonymous callers on stock reads", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(caller.stock.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects anonymous callers on the global bills list", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(caller.bills.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects non-admins on user-management procedures", async () => {
    const caller = appRouter.createCaller(ctx(session("user")));
    await expect(caller.users.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.users.create({
        name: "New User",
        email: "new@example.com",
        role: "user",
        password: "password123",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.users.setActive({ id: "u2", isActive: false }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects anonymous callers on user-management procedures", async () => {
    const caller = appRouter.createCaller(ctx(null));
    await expect(caller.users.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("blocks an admin from demoting their own account", async () => {
    const caller = appRouter.createCaller(ctx(session("admin")));
    await expect(
      caller.users.update({
        id: "u1",
        name: "Test",
        email: "test@example.com",
        role: "user",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("blocks an admin from deactivating their own account", async () => {
    const caller = appRouter.createCaller(ctx(session("admin")));
    await expect(
      caller.users.setActive({ id: "u1", isActive: false }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
