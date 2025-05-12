/**
 * Pure stock helpers shared by the server (sorting, validation) and the client
 * (badges, formatting). Keeping the Out/Low/OK rule and the quantity maths in
 * one place is the single source of truth referenced across the feature.
 */

import { z } from "zod";
import { STOCK_LOCATIONS } from "@/lib/constants";
import { dateString } from "@/lib/validators";
import { STOCK_MOVEMENT_KINDS } from "@/server/db/schema";

export type StockStatus = "out" | "low" | "ok";

/** On-hand quantities are stored with 3-decimal precision (matches the column). */
const STOCK_QTY_SCALE = 3;

/** Classify a quantity against its (optional) reorder level. */
export function stockStatus(
  qty: number,
  reorderLevel: number | null,
): StockStatus {
  if (qty <= 0) return "out";
  if (reorderLevel != null && qty <= reorderLevel) return "low";
  return "ok";
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  out: "Out of stock",
  low: "Low",
  ok: "In stock",
};

/** Parse a numeric DB value (Drizzle returns `numeric` as a string) to a number. */
export function toQty(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

/** Add a signed delta to a quantity, rounded to the column's scale. */
export function addQty(current: number, delta: number): number {
  return Number((current + delta).toFixed(STOCK_QTY_SCALE));
}

/** Display a quantity without noisy trailing zeros (4.000 → "4", 1.500 → "1.5"). */
export function fmtQty(value: string | number | null | undefined): string {
  const n = toQty(value);
  return String(Number(n.toFixed(STOCK_QTY_SCALE)));
}

// ---------------------------------------------------------------------------
// Stock availability / shortage detection
//
// Shared by the bill create flow's server pre-check (routers/bills.ts) and the
// bill form's live client-side check (bill-form.tsx), so both apply the SAME
// per-(article, location) summation and shortage rule. Quantities are the plain
// numbers carried on the stock rows / line items.
// ---------------------------------------------------------------------------

/** A storage location, as keyed in the availability map. */
type StockLocationKey = "warehouse" | "office";

/** The per-location on-hand fields a stock row must expose for availability. */
type StockAvailabilityRow = {
  articleNumber: string;
  warehouseQty: number;
  officeQty: number;
};

/** A requested line: how much of an article is wanted from one location. */
type RequestedLine = {
  articleNumber: string;
  location: StockLocationKey;
  qty: number;
};

/** One unmet line, summed per (article, location). The call site formats the message. */
export type StockShortageItem = {
  articleNumber: string;
  location: StockLocationKey;
  requested: number;
  available: number;
};

/** The `${articleNumber}::${location}` key shared by availability and requests. */
function locationKey(
  articleNumber: string,
  location: StockLocationKey,
): string {
  return `${articleNumber}::${location}`;
}

/**
 * Build the available-on-hand map keyed `${articleNumber}::warehouse` and
 * `${articleNumber}::office` from the per-location stock rows. Mirrors the map
 * built in routers/bills.ts and bill-form.tsx.
 */
export function calculateAvailableByLocation(
  stockRows: StockAvailabilityRow[],
): Map<string, number> {
  return new Map<string, number>(
    stockRows.flatMap((r) => [
      [locationKey(r.articleNumber, "warehouse"), r.warehouseQty],
      [locationKey(r.articleNumber, "office"), r.officeQty],
    ]),
  );
}

/**
 * Detect stock shortages for a set of requested lines against an availability
 * map (built by {@link calculateAvailableByLocation}). Requested quantity is
 * summed per (article, location) via `addQty` so split lines validate together;
 * a line is short when `addQty(available, -requested) < 0` (exactly draining a
 * location is fine). Missing keys count as zero available. Returns structured
 * shortages only — the human message ("need X, have Y in <label>") is formatted
 * at the call site with `fmtQty` + `STOCK_LOCATION_LABELS`.
 */
export function validateStockAvailable(
  items: RequestedLine[],
  availableByKey: Map<string, number>,
): StockShortageItem[] {
  const requested = new Map<string, number>();
  for (const it of items) {
    const key = locationKey(it.articleNumber, it.location);
    requested.set(key, addQty(requested.get(key) ?? 0, it.qty));
  }

  const shortages: StockShortageItem[] = [];
  for (const [key, req] of requested) {
    const available = availableByKey.get(key) ?? 0;
    if (addQty(available, -req) < 0) {
      const sep = key.lastIndexOf("::");
      const articleNumber = key.slice(0, sep);
      const location = key.slice(sep + 2) as StockLocationKey;
      shortages.push({ articleNumber, location, requested: req, available });
    }
  }
  return shortages;
}

// ---------------------------------------------------------------------------
// Stock table list logic (filter + sort)
//
// Extracted from stock-table.tsx so the search/category/low-only filter and the
// name/qty/status sort live in one DB-free, unit-testable place. Rows only need
// the fields the table reads; the component's StockListRow satisfies this.
// ---------------------------------------------------------------------------

/** The fields the stock list filter + sort read off a row. */
type StockTableRow = {
  articleNumber: string;
  name: string;
  category: string;
  quantityOnHand: number;
  reorderLevel: number | null;
};

export type StockSortKey = "name" | "quantityOnHand" | "status";
export type StockSortDir = "asc" | "desc";

export type StockTableFilters = {
  /** Free-text query over name / article number / category. */
  search: string;
  /** Exact category, or "All" for no category constraint. */
  category: string;
  /** When true, hide rows whose status is "ok" (keep out/low). */
  lowOnly: boolean;
};

/** Status ordering for the "status" sort: out before low before ok. */
const STATUS_RANK: Record<StockStatus, number> = { out: 0, low: 1, ok: 2 };

/**
 * Filter stock rows by category, low-only, and free-text search — the exact
 * predicates from stock-table.tsx. Search is trimmed + lowercased and matches
 * name, article number, or category.
 */
export function filterStockRows<T extends StockTableRow>(
  rows: T[],
  filters: StockTableFilters,
): T[] {
  const { search, category, lowOnly } = filters;
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (category !== "All" && r.category !== category) return false;
    if (lowOnly && stockStatus(r.quantityOnHand, r.reorderLevel) === "ok") {
      return false;
    }
    if (
      q &&
      !r.name.toLowerCase().includes(q) &&
      !r.articleNumber.toLowerCase().includes(q) &&
      !r.category.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Sort stock rows by name, total quantity, or status — the exact comparators
 * from stock-table.tsx, scaled by direction. Status sorts out→low→ok and breaks
 * ties on name. Returns a new array (does not mutate the input).
 */
export function sortStockRows<T extends StockTableRow>(
  rows: T[],
  sortKey: StockSortKey,
  dir: StockSortDir,
): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === "quantityOnHand") {
      return (a.quantityOnHand - b.quantityOnHand) * sign;
    }
    if (sortKey === "status") {
      const r =
        STATUS_RANK[stockStatus(a.quantityOnHand, a.reorderLevel)] -
        STATUS_RANK[stockStatus(b.quantityOnHand, b.reorderLevel)];
      return (r || a.name.localeCompare(b.name)) * sign;
    }
    return a.name.localeCompare(b.name) * sign;
  });
}

// ---------------------------------------------------------------------------
// Export filters
//
// URL/query-string-shaped zod schemas consumed by `buildExportTable`. Stock's
// schema is adapted at that boundary into `StockTableFilters` and fed through
// the SAME `filterStockRows` the on-screen table uses. Stock Activity has no
// in-memory equivalent — it's filtered in SQL (see `listAllStockMovements`),
// so its schema is parsed then passed straight through to the repo.
// ---------------------------------------------------------------------------

/** Stock list export filters. Every field optional/blank = no constraint. */
export const stockFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  lowOnly: z.string().optional(), // "true" | "false"
});
export type StockFilters = z.infer<typeof stockFilterSchema>;

/** Stock Activity export filters — parsed then fed to resolveRange + listAllStockMovements. */
export const stockMovementFilterSchema = z.object({
  dateFrom: dateString.optional(),
  dateTo: dateString.optional(),
  kind: z.enum(STOCK_MOVEMENT_KINDS).optional(),
  location: z.enum(STOCK_LOCATIONS).optional(),
  articleNumber: z.string().optional(),
});
export type StockMovementFilters = z.infer<typeof stockMovementFilterSchema>;
