import { z } from "zod";
import { USER_ROLES } from "@/lib/constants";

export const userRoleEnum = z.enum(USER_ROLES);
export type UserRoleInput = z.infer<typeof userRoleEnum>;

// Internal back-office tool; length-only requirement, no composition rules.
const PASSWORD_MIN_LENGTH = 8;

const nameEmailRole = {
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Invalid email address").max(255),
  role: userRoleEnum,
};

export const createUserSchema = z.object({
  ...nameEmailRole,
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    ),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().min(1),
  ...nameEmailRole,
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

const passwordFields = z.object({
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    ),
  confirmPassword: z.string(),
});

function checkPasswordsMatch(
  data: z.infer<typeof passwordFields>,
  ctx: z.RefinementCtx,
) {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: "custom",
      path: ["confirmPassword"],
      message: "Passwords do not match",
    });
  }
}

// Field-only version (no id) for the reset-password form's resolver.
export const resetPasswordFormSchema =
  passwordFields.superRefine(checkPasswordsMatch);
export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;

export const resetPasswordSchema = passwordFields
  .extend({ id: z.string().min(1) })
  .superRefine(checkPasswordsMatch);
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const setUserActiveSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean(),
});
export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>;
