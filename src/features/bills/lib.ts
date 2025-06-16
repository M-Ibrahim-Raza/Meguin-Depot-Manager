import { z } from "zod";
import { lineTotalPaisas, rupeesToPaisas } from "@/lib/format";
import type { StockLocation } from "@/lib/constants";
import type { BillWithCustomer } from "@/server/db/repos/bills.repo";
import type { Bill } from "@/server/db/schema";
import type { BillLineInput } from "./schemas";

/** Bill export filters. All optional; "all"/empty means no constraint. */
export const billFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  direction: z.string().optional(),
  customerId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
export type BillFilters = z.infer<typeof billFilterSchema>;

/** Shared bill filter predicate, used by both per-customer and global exports. */
export function filterBills(
  rows: BillWithCustomer[],
  f: BillFilters,
): BillWithCustomer[] {
  const q = (f.search ?? "").trim().toLowerCase();
  const status = f.status ?? "all";
  const direction = f.direction ?? "all";
  const customerId = f.customerId ?? "all";
  const dateFrom = f.dateFrom ?? "";
  const dateTo = f.dateTo ?? "";
  return rows.filter((b) => {
    if (status !== "all" && b.status !== status) return false;
    if (direction !== "all" && b.direction !== direction) return false;
    if (customerId !== "all" && String(b.customerId) !== customerId)
      return false;
    if (dateFrom && b.date < dateFrom) return false;
    if (dateTo && b.date > dateTo) return false;
    if (q) {
      const hay = `${b.customerName} ${b.billNo} ${b.note ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/** The minimal shape `calculateBillTotal` reads off each product — the full
 * `Product` row satisfies it, so the router's and form's product maps both fit. */
type Priced = { pricePaisas: bigint };

/**
 * The unit price a line actually charges: the product's catalogue price, or
 * the line's own `salePriceRupees` when the seller has upsold it (a positive
 * value overrides the catalogue price; `0` means "no override"). Single
 * source of truth reused by `calculateBillTotal`, the router's bill-item
 * snapshot builder, and the form's live per-line total — so all three can
 * never drift apart.
 */
export function resolveLineUnitPricePaisas(
  item: Pick<BillLineInput, "salePriceRupees">,
  product: Priced,
): bigint {
  return item.salePriceRupees > 0
    ? rupeesToPaisas(item.salePriceRupees)
    : product.pricePaisas;
}

/**
 * Sum a bill's line totals in paisas.
 *
 * Each line is `qty × unitPricePaisas` (resolved via {@link resolveLineUnitPricePaisas},
 * so an upsold line contributes its higher price), rounded per line via
 * {@link lineTotalPaisas} (so the result matches the router's running total and
 * the form's live total exactly). Lines whose article is absent from `products`
 * are skipped, mirroring the form's "unknown product, no contribution" behaviour;
 * the router pre-validates every article before calling this, so it never
 * encounters a miss.
 */
export function calculateBillTotal(
  items: ReadonlyArray<
    Pick<BillLineInput, "articleNumber" | "qty" | "salePriceRupees">
  >,
  products: ReadonlyMap<string, Priced>,
): bigint {
  let total = 0n;
  for (const item of items) {
    const product = products.get(item.articleNumber);
    if (!product) continue;
    total += lineTotalPaisas(
      item.qty,
      resolveLineUnitPricePaisas(item, product),
    );
  }
  return total;
}

/**
 * Sum of each line's extra revenue from being sold above its catalogue price
 * (0 for a bill with no upsold lines). Mirrors `calculateBillTotal`'s per-line
 * rounding via {@link lineTotalPaisas} — the per-line delta, not a difference
 * of two independently-rounded totals — so it always foots exactly against
 * `calculateBillTotal(items, products) - calculateBillTotal(items-at-list-price, products)`.
 */
export function calculateBillUpsellPaisas(
  items: ReadonlyArray<
    Pick<BillLineInput, "articleNumber" | "qty" | "salePriceRupees">
  >,
  products: ReadonlyMap<string, Priced>,
): bigint {
  let total = 0n;
  for (const item of items) {
    const product = products.get(item.articleNumber);
    if (!product) continue;
    const resolvedPaisas = resolveLineUnitPricePaisas(item, product);
    if (resolvedPaisas <= product.pricePaisas) continue;
    total +=
      lineTotalPaisas(item.qty, resolvedPaisas) -
      lineTotalPaisas(item.qty, product.pricePaisas);
  }
  return total;
}

/** One bill line whose entered sale price undercuts the product's catalogue
 * price — upselling (selling above list) is allowed, undercutting isn't. */
export type UpsellIssue = {
  articleNumber: string;
  location: StockLocation;
  listedPaisas: bigint;
  enteredPaisas: bigint;
};

/**
 * Find every line whose `salePriceRupees` override falls below the product's
 * current catalogue price. Mirrors `validateStockAvailable`'s shape and dual
 * use: the form runs this for an instant, client-side submit guard (on top of
 * the UI's own floor-clamping), and the router re-runs it as the authoritative
 * check before persisting, since the client can't be trusted to send a price
 * that still honours a possibly-changed catalogue price.
 */
export function validateUpsellPrices(
  items: ReadonlyArray<
    Pick<BillLineInput, "articleNumber" | "location" | "salePriceRupees">
  >,
  products: ReadonlyMap<string, Priced>,
): UpsellIssue[] {
  const issues: UpsellIssue[] = [];
  for (const item of items) {
    if (item.salePriceRupees <= 0) continue;
    const product = products.get(item.articleNumber);
    if (!product) continue;
    const enteredPaisas = rupeesToPaisas(item.salePriceRupees);
    if (enteredPaisas < product.pricePaisas) {
      issues.push({
        articleNumber: item.articleNumber,
        location: item.location,
        listedPaisas: product.pricePaisas,
        enteredPaisas,
      });
    }
  }
  return issues;
}

/** Resolved standing of a new bill: persisted status, the customer-outstanding
 * change to apply, and whether it breached the credit limit. */
export type BillStatusResult = {
  status: "paid" | "unpaid" | "pending_approval";
  /** How much to add to the customer's outstanding when the bill commits. */
  outstandingDeltaPaisas: bigint;
  /** Projected outstanding strictly exceeds the credit limit (only for deferred). */
  overLimit: boolean;
};

type BillStatusInput = {
  type: "cash" | "deferred";
  totalPaisas: bigint;
  outstandingPaisas: bigint;
  creditLimitPaisas: bigint;
  /** An admin auto-approves over-limit bills; a user's go to pending approval. */
  isAdmin: boolean;
};

/**
 * Decide a new bill's status, outstanding delta, and over-limit flag from the
 * customer's credit position — the pure core of the bill `create` flow.
 *
 * - **cash** → `paid`, no outstanding change, never over-limit.
 * - **deferred**, projected outstanding (`outstanding + total`) within the limit
 *   → `unpaid`, full total added to outstanding.
 * - **deferred** and projected outstanding strictly above the limit (`> limit`,
 *   so landing exactly on the limit is fine): an **admin** auto-approves
 *   (`unpaid`, full delta); a **user** gets `pending_approval` with no delta yet
 *   (outstanding bumps later on approval).
 *
 * `overLimit` is returned independently so the caller can run the "one pending
 * bill per customer" guard — that DB check stays in the router.
 */
export function computeBillStatus({
  type,
  totalPaisas,
  outstandingPaisas,
  creditLimitPaisas,
  isAdmin,
}: BillStatusInput): BillStatusResult {
  if (type !== "deferred") {
    return { status: "paid", outstandingDeltaPaisas: 0n, overLimit: false };
  }

  const projected = outstandingPaisas + totalPaisas;
  const overLimit = projected > creditLimitPaisas;

  if (overLimit && !isAdmin) {
    return {
      status: "pending_approval",
      outstandingDeltaPaisas: 0n,
      overLimit: true,
    };
  }

  // Within limit, or over limit but an admin auto-approves.
  return { status: "unpaid", outstandingDeltaPaisas: totalPaisas, overLimit };
}

/** Print-copy titles for a sale bill vs. a return (credit note). */
export const SALE_COPY_TITLES = [
  "Office Bill",
  "Stock Bill",
  "Receiving Bill",
] as const;
export const RETURN_COPY_TITLES = [
  "Office Return",
  "Stock Return",
  "Customer Return",
] as const;
export type BillCopyTitle =
  | (typeof SALE_COPY_TITLES)[number]
  | (typeof RETURN_COPY_TITLES)[number];

/** Which copy titles to offer/print for a bill, based on its direction. */
export function getBillCopyTitles(
  direction: Bill["direction"],
): readonly BillCopyTitle[] {
  return direction === "return" ? RETURN_COPY_TITLES : SALE_COPY_TITLES;
}

/**
 * Find the first duplicated `(articleNumber, location)` line in a bill.
 *
 * A product may appear once per location (some from office, some from warehouse),
 * so the key is the `${articleNumber}::${location}` pair. Returns that key for the
 * first repeat, or `null` when every pair is unique.
 */
export function findDuplicateLine(
  items: ReadonlyArray<Pick<BillLineInput, "articleNumber" | "location">>,
): string | null {
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.articleNumber}::${item.location}`;
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}
