import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { productsRouter } from "./routers/products";
import { categoriesRouter } from "./routers/categories";

export const appRouter = createTRPCRouter({
  products: productsRouter,
  categories: categoriesRouter,
});

export type AppRouter = typeof appRouter;

/** Factory for a server-side caller (used by the RSC server caller). */
export const createCaller = createCallerFactory(appRouter);
