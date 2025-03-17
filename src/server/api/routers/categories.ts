import { TRPCError } from "@trpc/server";
import {
  createCategorySchema,
  deleteCategorySchema,
} from "@/features/products/schemas";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  countProductsInCategory,
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
} from "@/server/db/repos/categories.repo";

/** Returns the Postgres SQLSTATE for a driver error, if present. */
function pgErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

/** unique_violation, thrown when a category name already exists. */
function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23505";
}

const DUPLICATE_CATEGORY_ERROR = new TRPCError({
  code: "CONFLICT",
  message: "Category already exists",
});

/**
 * Category API. Categories classify products. Listing is open to any signed-in
 * user (`protectedProcedure`); creating and deleting categories is admin-only
 * (`adminProcedure`). A category cannot be deleted while products are filed
 * under it.
 */
export const categoriesRouter = createTRPCRouter({
  /** All categories, sorted by name. */
  list: protectedProcedure.query(() => listCategories()),

  /** Create a category by name (admin only); duplicate name maps to CONFLICT. */
  create: adminProcedure
    .input(createCategorySchema)
    .mutation(async ({ input }) => {
      try {
        const category = await createCategory(input.name);
        return { id: category.id, name: category.name };
      } catch (error) {
        if (isUniqueViolation(error)) throw DUPLICATE_CATEGORY_ERROR;
        throw error;
      }
    }),

  /**
   * Delete a category by id (admin only); 404 if not found, and CONFLICT if any
   * products are still filed under it.
   */
  delete: adminProcedure
    .input(deleteCategorySchema)
    .mutation(async ({ input }) => {
      const category = await getCategory(input.id);
      if (!category) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }
      const inUse = await countProductsInCategory(category.name);
      if (inUse > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Category is used by ${inUse} product${inUse === 1 ? "" : "s"}`,
        });
      }
      await deleteCategory(input.id);
      return { id: input.id };
    }),
});
