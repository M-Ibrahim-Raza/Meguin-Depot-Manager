import type { TRPCClientErrorLike } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";

/**
 * Extract a user-friendly message from a tRPC client error for toasts.
 * Prefers the first Zod validation message (surfaced via the server's
 * errorFormatter), falling back to the TRPCError message.
 */
export function getErrorMessage(error: TRPCClientErrorLike<AppRouter>): string {
  const zodError = error.data?.zodError;
  if (zodError) {
    const candidates = [
      ...Object.values(zodError.fieldErrors ?? {}).flat(),
      ...(zodError.formErrors ?? []),
    ];
    const first = candidates.find(
      (m): m is string => typeof m === "string" && m.length > 0,
    );
    if (first) return first;
  }
  return error.message;
}
