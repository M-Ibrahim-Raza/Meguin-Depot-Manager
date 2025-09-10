/**
 * Pure, DB-free helpers for stock transfers — shared by the server and the
 * client (form direction toggle, list search, slip labels). Keeping the route
 * label and the list filter here means the same logic feeds the on-screen list
 * and any future export, and it unit-tests without a database.
 */
import { STOCK_LOCATION_LABELS, type StockLocation } from "@/lib/constants";

/** The opposite of the given location — used by the From/To toggle and "reverse". */
export function otherLocation(location: StockLocation): StockLocation {
  return location === "warehouse" ? "office" : "warehouse";
}

/** A single line on a transfer as the validator sees it — quantity only, no price. */
export type TransferLine = {
  articleNumber: string;
  qty: number;
};

/** The shape `validateTransferInput` checks: a direction plus its lines. */
export type ValidateTransferArgs = {
  from: StockLocation;
  to: StockLocation;
  lines: readonly TransferLine[];
};

/**
 * Why each rejection — kept as a stable string union so callers can map it to a
 * field message (tRPC `BAD_REQUEST`, the form, a future export validator)
 * without re-deriving the rule.
 */
export type TransferValidationError =
  | "same-location"
  | "empty"
  | "non-positive-qty"
  | "duplicate-line";

export type TransferValidationResult =
  | { ok: true }
  | { ok: false; error: TransferValidationError };

/**
 * Pure validation of a transfer's direction and lines — DB-free, so it unit-tests
 * without a database and serves both the client form and the tRPC boundary. It
 * reproduces (and consolidates) the rules currently spread across
 * `createTransferSchema` (source ≠ destination via `otherLocation`, at least one
 * line, positive quantities) and the `create` router's duplicate-line guard.
 *
 * It does NOT cover the rules that need data the input alone can't answer:
 * product existence (needs the product list) and source-stock sufficiency (needs
 * the ledger) — those stay at their DB-backed call sites.
 */
export function validateTransferInput({
  from,
  to,
  lines,
}: ValidateTransferArgs): TransferValidationResult {
  // You can't transfer stock to where it already is — the destination must be
  // the other location.
  if (to !== otherLocation(from)) return { ok: false, error: "same-location" };
  if (lines.length === 0) return { ok: false, error: "empty" };

  const seen = new Set<string>();
  for (const line of lines) {
    if (line.qty <= 0) return { ok: false, error: "non-positive-qty" };
    if (seen.has(line.articleNumber)) {
      return { ok: false, error: "duplicate-line" };
    }
    seen.add(line.articleNumber);
  }

  return { ok: true };
}

/** A human "From → To" label, e.g. "Warehouse → Office". */
export function transferRouteLabel(
  from: StockLocation,
  to: StockLocation,
): string {
  return `${STOCK_LOCATION_LABELS[from]} → ${STOCK_LOCATION_LABELS[to]}`;
}

/** The fields `filterTransfers` searches over (a subset of the list row). */
export type TransferFilterRow = {
  slipNo: string;
  fromLocation: StockLocation;
  toLocation: StockLocation;
  note: string | null;
  createdByName: string | null;
};

/**
 * Filter transfers by a free-text query across slip number, location labels,
 * note, and creator name. Empty/whitespace query returns every row.
 */
export function filterTransfers<T extends TransferFilterRow>(
  transfers: readonly T[],
  search: string,
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...transfers];
  return transfers.filter((t) => {
    const haystack = [
      t.slipNo,
      STOCK_LOCATION_LABELS[t.fromLocation],
      STOCK_LOCATION_LABELS[t.toLocation],
      t.note ?? "",
      t.createdByName ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
