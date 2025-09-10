import { z } from "zod";
import { STOCK_LOCATIONS } from "@/lib/constants";
import { dateString, positiveQty } from "@/lib/validators";

/** One product line on a transfer — quantity only, no price. */
export const transferLineSchema = z.object({
  articleNumber: z.string().min(1),
  qty: positiveQty,
});
export type TransferLineInput = z.infer<typeof transferLineSchema>;

/**
 * Create a stock transfer between the two locations. `toLocation` must differ
 * from `fromLocation` (you can't transfer stock to where it already is). Shared
 * by the client form (`zodResolver`) and the tRPC boundary (`.parse`).
 */
export const createTransferSchema = z
  .object({
    fromLocation: z.enum(STOCK_LOCATIONS),
    toLocation: z.enum(STOCK_LOCATIONS),
    date: dateString,
    note: z.string().trim().max(200).optional().default(""),
    items: z.array(transferLineSchema).min(1, "Add at least one product"),
  })
  .refine((v) => v.fromLocation !== v.toLocation, {
    message: "Source and destination must be different",
    path: ["toLocation"],
  });
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
