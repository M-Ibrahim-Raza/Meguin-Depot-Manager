import { z } from "zod";
import { dateString } from "@/lib/validators";

export const returnLineSchema = z.object({
  articleNumber: z.string().min(1),
  qty: z
    .number({ message: "Quantity is required" })
    .positive("Quantity must be greater than 0")
    .max(10_000, "Quantity too large")
    .finite(),
});
export type ReturnLineInput = z.infer<typeof returnLineSchema>;

export const createReturnSchema = z.object({
  customerId: z.number().int().positive(),
  date: dateString,
  note: z.string().max(200).optional().default(""),
  items: z.array(returnLineSchema).min(1, "Add at least one product"),
});
export type CreateReturnInput = z.infer<typeof createReturnSchema>;
