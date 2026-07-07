import { z } from "zod";

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name must be at most 50 characters");

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const registerSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // Don't enforce length rules on login — only that something was entered
  password: z.string().min(1, "Enter your password"),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const profileSchema = z.object({
  displayName: displayNameSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

/** Returns the first validation error message, or null if valid. */
export function firstError(result: z.SafeParseReturnType<unknown, unknown>) {
  return result.success ? null : result.error.issues[0]?.message ?? "Invalid input";
}
