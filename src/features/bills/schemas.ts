import { z } from "zod";
import { STOCK_LOCATIONS } from "@/lib/constants";
import { dateString } from "@/lib/validators";

export const billLineSchema = z.object({
  articleNumber: z.string().min(1),
  // Which storage location this line draws its stock from.
  location: z.enum(STOCK_LOCATIONS),
  qty: z
    .number({ message: "Quantity is required" })
    .positive("Quantity must be greater than 0")
    .max(10_000, "Quantity too large")
    .finite(),
  // 0 = no override, use the product's current price. When set, must be >=
  // the product's price (an upsell) — enforced in lib.ts/the router, since
  // the base price isn't known to zod alone.
  salePriceRupees: z
    .number()
    .int()
    .nonnegative()
    .max(100_000_000, "Price too large")
    .default(0),
});
export type BillLineInput = z.infer<typeof billLineSchema>;

export const createBillSchema = z.object({
  customerId: z.number().int().positive(),
  date: dateString,
  type: z.enum(["cash", "deferred"]),
  note: z.string().max(200).optional().default(""),
  items: z.array(billLineSchema).min(1, "Add at least one product"),
  // Admin-only: sell past available stock (recorded as a negative on-hand).
  // Ignored for non-admin callers server-side.
  override: z.boolean().optional().default(false),
});
export type CreateBillInput = z.infer<typeof createBillSchema>;
