import { z } from "zod";
import { getStatus } from "@/lib/format";
import type { Customer } from "@/server/db/schema";

/** Customer list/export filters. All optional; "all"/empty means no constraint. */
export const customerFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  area: z.string().optional(),
  /** Registration-date (createdAt) range, inclusive, as YYYY-MM-DD. */
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
export type CustomerFilters = z.infer<typeof customerFilterSchema>;

/** The createdAt instant as a YYYY-MM-DD day for date-range comparison. */
function createdDay(c: Customer): string {
  return c.createdAt ? c.createdAt.toISOString().slice(0, 10) : "";
}

/**
 * Shared customer filter predicate — the single source of truth used by both
 * the Customers list page and the export route, guaranteeing identical results.
 */
export function filterCustomers(
  rows: Customer[],
  f: CustomerFilters,
): Customer[] {
  const q = (f.search ?? "").trim().toLowerCase();
  const status = f.status ?? "all";
  const area = f.area ?? "all";
  const dateFrom = f.dateFrom ?? "";
  const dateTo = f.dateTo ?? "";
  return rows.filter((c) => {
    if (area !== "all" && c.area !== area) return false;
    if (status !== "all") {
      if (getStatus(c.outstandingPaisas, c.creditLimitPaisas) !== status) {
        return false;
      }
    }
    if (dateFrom || dateTo) {
      const day = createdDay(c);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
    }
    if (q) {
      if (
        !c.name.toLowerCase().includes(q) &&
        !(c.phone ?? "").toLowerCase().includes(q) &&
        !(c.area ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}
