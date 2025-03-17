import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(60),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const deleteCategorySchema = z.object({
  id: z.number().int().positive(),
});
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;

export const createProductSchema = z.object({
  articleNumber: z
    .string()
    .trim()
    .min(1, "Article number is required")
    .max(50, "Article number too long")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and dashes only"),
  name: z.string().trim().min(1, "Name is required").max(120),
  unit: z.string().trim().min(1, "Unit is required").max(60),
  category: z.string().trim().min(1, "Category is required").max(60),
  priceRupees: z
    .number({ message: "Enter a valid price" })
    .positive("Price must be greater than 0")
    .finite()
    .max(100_000_000, "Price too large"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// The article number is the immutable primary key, so it doubles as the
// identifier on update — no separate id field is needed.
export const updateProductSchema = createProductSchema;

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const deleteProductSchema = z.object({
  articleNumber: z.string().min(1),
});
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
