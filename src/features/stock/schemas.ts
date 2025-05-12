import { z } from "zod";
import { STOCK_LOCATIONS } from "@/lib/constants";
import { DATE_RANGE_PRESETS } from "@/lib/date-range";
import { dateString, nonNegativeQty, positiveQty } from "@/lib/validators";
import { STOCK_MOVEMENT_KINDS } from "@/server/db/schema";

const articleNumber = z.string().min(1);
const location = z.enum(STOCK_LOCATIONS);

/** Set the one-time opening baseline for a location (may be 0). */
export const setOpeningSchema = z.object({
  articleNumber,
  location,
  qty: nonNegativeQty,
});
export type SetOpeningInput = z.infer<typeof setOpeningSchema>;

/** Restock a location by a positive amount. */
export const addStockSchema = z.object({
  articleNumber,
  location,
  qty: positiveQty,
  note: z.string().trim().max(200).optional(),
});
export type AddStockInput = z.infer<typeof addStockSchema>;

/** Correct a location's on-hand to a counted value; reason is mandatory. */
export const adjustStockSchema = z.object({
  articleNumber,
  location,
  counted: nonNegativeQty,
  note: z.string().trim().min(1, "A reason is required").max(200),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

/** Set or clear the low-stock threshold (null clears it). */
export const setReorderLevelSchema = z.object({
  articleNumber,
  reorderLevel: nonNegativeQty.nullable(),
});
export type SetReorderLevelInput = z.infer<typeof setReorderLevelSchema>;

export const movementsByArticleSchema = z.object({ articleNumber });

/**
 * The global activity-log query. The client sends the date `range` preset (or
 * `from`/`to` strings for `custom`); the server resolves those to concrete
 * `created_at` instants in {@link APP_TIMEZONE} (see `resolveRange`). `cursor`
 * drives id-based pagination — the page seeds the first page server-side and
 * the client requests subsequent ones via infinite scroll.
 */
export const movementsQuerySchema = z.object({
  range: z.enum(DATE_RANGE_PRESETS).optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  kind: z.enum(STOCK_MOVEMENT_KINDS).optional(),
  location: z.enum(STOCK_LOCATIONS).optional(),
  articleNumber: articleNumber.optional(),
  cursor: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(200).optional(),
});
export type MovementsQueryInput = z.infer<typeof movementsQuerySchema>;
