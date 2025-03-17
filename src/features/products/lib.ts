import { z } from "zod";
import type { Product } from "@/server/db/schema";

/** Product list filters. All optional; "All"/empty means no constraint. */
export const productFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
});
export type ProductFilters = z.infer<typeof productFilterSchema>;

/** The category select's options: "All" first, then the unique categories sorted. */
export function categoryOptions(rows: Product[]): string[] {
  return ["All", ...Array.from(new Set(rows.map((p) => p.category))).sort()];
}

/**
 * Shared product filter predicate — the single source of truth behind the
 * Products grid's category buttons and search box. The "All" category is the
 * no-constraint sentinel; search is a case-insensitive substring match across
 * name, article number, and category.
 */
export function filterProducts(rows: Product[], f: ProductFilters): Product[] {
  const q = (f.search ?? "").trim().toLowerCase();
  const category = f.category ?? "All";
  return rows.filter((p) => {
    if (category !== "All" && p.category !== category) return false;
    if (
      q &&
      !p.name.toLowerCase().includes(q) &&
      !p.articleNumber.toLowerCase().includes(q) &&
      !p.category.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });
}
