import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

export const appRouter = createTRPCRouter({});

export type AppRouter = typeof appRouter;

/** Factory for a server-side caller (used by the RSC server caller). */
export const createCaller = createCallerFactory(appRouter);
