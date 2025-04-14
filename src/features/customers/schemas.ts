import { z } from "zod";
import { BILL_TYPES } from "@/lib/constants";

export const customerPaymentTypeEnum = z.enum(BILL_TYPES);
export type CustomerPaymentType = z.infer<typeof customerPaymentTypeEnum>;

const customerBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  area: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  referral: z.string().trim().max(120).optional().default(""),
  creditLimitRupees: z
    .number({ message: "Credit limit is required" })
    .int()
    .nonnegative("Credit limit cannot be negative")
    .max(100_000_000, "Credit limit too large"),
  paymentType: customerPaymentTypeEnum.default("deferred"),
});

// Only settable at creation, to seed the ledger for customers migrated from
// a previous system without importing their full bill/payment history.
export const createCustomerSchema = customerBaseSchema
  .extend({
    initialOutstandingRupees: z
      .number()
      .int()
      .nonnegative("Initial outstanding cannot be negative")
      .optional()
      .default(0),
  })
  .superRefine((data, ctx) => {
    if (data.initialOutstandingRupees > data.creditLimitRupees) {
      ctx.addIssue({
        code: "custom",
        path: ["initialOutstandingRupees"],
        message: "Initial outstanding cannot exceed the credit limit",
      });
    }
  });
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = customerBaseSchema.extend({
  id: z.number().int().positive(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
