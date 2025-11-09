import { z } from "zod";
import type { User } from "@/server/db/schema";

/** User list filters. All optional; "all"/empty means no constraint. */
export const userFilterSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
});
export type UserFilters = z.infer<typeof userFilterSchema>;

/**
 * Shared user filter predicate — the single source of truth for the Manage
 * Users list, mirroring `filterCustomers`.
 */
export function filterUsers(rows: User[], f: UserFilters): User[] {
  const q = (f.search ?? "").trim().toLowerCase();
  const role = f.role ?? "all";
  const status = f.status ?? "all";
  return rows.filter((u) => {
    if (role !== "all" && u.role !== role) return false;
    if (status !== "all") {
      const isActive = status === "active";
      if (u.isActive !== isActive) return false;
    }
    if (q) {
      if (
        !(u.name ?? "").toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}
