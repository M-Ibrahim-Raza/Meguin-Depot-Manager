import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/constants";
import { dateString } from "@/lib/validators";

export const paymentMethodEnum = z.enum(PAYMENT_METHODS);

export const recordPaymentSchema = z.object({
  customerId: z.number().int().positive(),
  date: dateString,
  amountRupees: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0")
    .finite()
    .max(100_000_000, "Amount too large"),
  method: paymentMethodEnum,
  note: z.string().max(200).optional().default(""),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const approvePaymentSchema = z.object({
  id: z.number().int().positive(),
  remark: z.string().trim().max(500).optional(),
});
export type ApprovePaymentInput = z.infer<typeof approvePaymentSchema>;

export const rejectPaymentSchema = z.object({
  id: z.number().int().positive(),
  reason: z
    .string()
    .trim()
    .min(3, "Reason is required (3+ characters)")
    .max(200),
  remark: z.string().trim().max(500).optional(),
});
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
