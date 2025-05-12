import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { categoriesRouter } from "./routers/categories";
import { customersRouter } from "./routers/customers";
import { productsRouter } from "./routers/products";
import { stockRouter } from "./routers/stock";

export const appRouter = createTRPCRouter({
  products: productsRouter,
  categories: categoriesRouter,
  customers: customersRouter,
  stock: stockRouter,
});

export type AppRouter = typeof appRouter;

/** Factory for a server-side caller (used by the RSC server caller). */
export const createCaller = createCallerFactory(appRouter);
