import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { billsRouter } from "./routers/bills";
import { categoriesRouter } from "./routers/categories";
import { customersRouter } from "./routers/customers";
import { paymentsRouter } from "./routers/payments";
import { productsRouter } from "./routers/products";
import { returnsRouter } from "./routers/returns";
import { stockRouter } from "./routers/stock";

export const appRouter = createTRPCRouter({
  products: productsRouter,
  categories: categoriesRouter,
  customers: customersRouter,
  stock: stockRouter,
  bills: billsRouter,
  payments: paymentsRouter,
  returns: returnsRouter,
});

export type AppRouter = typeof appRouter;

/** Factory for a server-side caller (used by the RSC server caller). */
export const createCaller = createCallerFactory(appRouter);
