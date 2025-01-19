import { z } from "zod";

/**
 * Cross-cutting zod field validators shared by feature `schemas.ts` files, so a
 * single definition (regex, bounds, and error copy) backs every form + server
 * boundary that needs it. Feature-specific rules (e.g. the bill line's smaller
 * qty ceiling) still live in their own schema.
 */

/** A calendar date in `YYYY-MM-DD` form. */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** A strictly-positive quantity (sales, transfers, stock additions). */
export const positiveQty = z
  .number({ message: "Quantity is required" })
  .positive("Quantity must be greater than 0")
  .max(1_000_000, "Quantity too large")
  .finite();

/** A non-negative quantity (opening baselines, counted adjustments, reorder levels). */
export const nonNegativeQty = z
  .number({ message: "Quantity is required" })
  .min(0, "Quantity can't be negative")
  .max(1_000_000, "Quantity too large")
  .finite();
