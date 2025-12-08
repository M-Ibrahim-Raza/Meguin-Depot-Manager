import { z } from "zod";

export const requestReversalSchema = z.object({
  paymentId: z.number().int().positive(),
  amountRupees: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0")
    .finite()
    .max(100_000_000, "Amount too large"),
  reason: z
    .string()
    .trim()
    .min(3, "Reason is required (3+ characters)")
    .max(200),
});
export type RequestReversalInput = z.infer<typeof requestReversalSchema>;

export const approveReversalSchema = z.object({
  id: z.number().int().positive(),
});
export type ApproveReversalInput = z.infer<typeof approveReversalSchema>;

export const rejectReversalSchema = z.object({
  id: z.number().int().positive(),
  reason: z
    .string()
    .trim()
    .min(3, "Reason is required (3+ characters)")
    .max(200),
});
export type RejectReversalInput = z.infer<typeof rejectReversalSchema>;
