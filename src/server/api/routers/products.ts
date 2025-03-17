import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createProductSchema,
  deleteProductSchema,
  updateProductSchema,
} from "@/features/products/schemas";
import { rupeesToPaisas } from "@/lib/format";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import { categoryExists } from "@/server/db/repos/categories.repo";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "@/server/db/repos/products.repo";

/** Returns the Postgres SQLSTATE for a driver error, if present. */
function pgErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/** unique_violation, thrown when an article number already exists. */
function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23505";
}

/** foreign_key_violation, thrown by ON DELETE restrict when a product is billed. */
function isForeignKeyViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23503";
}

const DUPLICATE_ARTICLE_ERROR = new TRPCError({
  code: "CONFLICT",
  message: "Article number already in use",
});

const PRODUCT_IN_USE_ERROR = new TRPCError({
  code: "CONFLICT",
  message: "This product is used on existing bills and can't be deleted",
});

const UNKNOWN_CATEGORY_ERROR = new TRPCError({
  code: "BAD_REQUEST",
  message: "Unknown category",
});

/**
 * Product API (products are keyed by `articleNumber` and carry a `category`,
 * `unit`, and `pricePaisas`). Reads are open to any signed-in user
 * (`protectedProcedure`); creating, updating, and deleting a product are
 * admin-only (`adminProcedure`). Prices arrive as rupees and are stored as
 * `bigint` paisas via `rupeesToPaisas`. Writes guard referential integrity: an
 * unknown category is rejected, a duplicate article number maps to a
 * CONFLICT, and deleting a product that appears on bills is blocked.
 */
export const productsRouter = createTRPCRouter({
  /** All products, sorted by name. */
  list: protectedProcedure.query(() => listProducts()),

  /** One product by its article number; 404 if not found. */
  byArticleNumber: protectedProcedure
    .input(z.object({ articleNumber: z.string().min(1) }))
    .query(async ({ input }) => {
      const product = await getProduct(input.articleNumber);
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }
      return product;
    }),

  /**
   * Create a product (admin only). Validates the category exists, stores the
   * price as paisas, and seeds its stock row at 0; rejects a duplicate
   * article number with CONFLICT.
   */
  create: adminProcedure
    .input(createProductSchema)
    .mutation(async ({ input }) => {
      if (!(await categoryExists(input.category))) throw UNKNOWN_CATEGORY_ERROR;
      try {
        const product = await createProduct({
          articleNumber: input.articleNumber,
          name: input.name,
          unit: input.unit,
          category: input.category,
          pricePaisas: rupeesToPaisas(input.priceRupees),
        });
        return { articleNumber: product.articleNumber };
      } catch (error) {
        if (isUniqueViolation(error)) throw DUPLICATE_ARTICLE_ERROR;
        throw error;
      }
    }),

  /**
   * Update a product's mutable fields by article number (admin only).
   * Validates the category exists and stores the price as paisas; 404 if the
   * product is not found.
   */
  update: adminProcedure
    .input(updateProductSchema)
    .mutation(async ({ input }) => {
      if (!(await categoryExists(input.category))) throw UNKNOWN_CATEGORY_ERROR;
      const product = await updateProduct(input.articleNumber, {
        name: input.name,
        unit: input.unit,
        category: input.category,
        pricePaisas: rupeesToPaisas(input.priceRupees),
      });
      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }
      return { articleNumber: product.articleNumber };
    }),

  /**
   * Delete a product by article number (admin only); blocked with CONFLICT
   * if the product is referenced by existing bills.
   */
  delete: adminProcedure
    .input(deleteProductSchema)
    .mutation(async ({ input }) => {
      try {
        await deleteProduct(input.articleNumber);
        return { articleNumber: input.articleNumber };
      } catch (error) {
        if (isForeignKeyViolation(error)) throw PRODUCT_IN_USE_ERROR;
        throw error;
      }
    }),
});
