import { lineTotalPaisas } from "@/lib/format";
import type { ReturnableProduct } from "@/server/db/repos/returns.repo";
import type { ReturnLineInput } from "./schemas";

/**
 * One priced, snapshotted return line as it is persisted. Product name, unit, and
 * unit price are frozen at creation time (the customer is credited what they were
 * last charged), and `qty` is stored as a string to preserve the exact entered
 * fractional quantity in the numeric DB column.
 */
export type ReturnSnapshotItem = {
  articleNumber: string;
  nameSnapshot: string;
  unitSnapshot: string;
  unitPricePaisas: bigint;
  /** No upsell concept for returns — always equal to unitPricePaisas. */
  basePricePaisas: bigint;
  qty: string;
};

/** A returnable pool keyed by article number — what both call sites build to look lines up. */
export type ReturnablePool = Map<string, ReturnableProduct>;

/** Why a return line was rejected. Translated to a TRPCError message at the boundary. */
export type ReturnValidationError = "not-returnable" | "duplicate" | "over-cap";

/**
 * Outcome of validating a set of return lines: either every line is accepted —
 * yielding the persisted snapshot rows and the total credit — or the first failing
 * line, with the reason and offending article. The error variants map 1:1 to the
 * router's `TRPCError` messages, so no tRPC dependency leaks into this pure layer.
 */
export type ValidateReturnResult =
  | { ok: true; items: ReturnSnapshotItem[]; amountPaisas: bigint }
  | { ok: false; error: ReturnValidationError; articleNumber: string };

/**
 * Build the persisted snapshot for one return line from the matched returnable
 * product. Name, unit, and unit price are frozen here; `qty` is serialized to a
 * string so the exact entered quantity round-trips into the numeric column.
 */
export function createReturnLineSnapshot(
  returnable: ReturnableProduct,
  qty: number,
): ReturnSnapshotItem {
  return {
    articleNumber: returnable.articleNumber,
    nameSnapshot: returnable.name,
    unitSnapshot: returnable.unit,
    unitPricePaisas: returnable.latestUnitPricePaisas,
    basePricePaisas: returnable.latestUnitPricePaisas,
    qty: qty.toString(),
  };
}

/**
 * Validate and price each return line against the customer's returnable pool,
 * applying the same checks, in the same order, as the create mutation:
 * not-returnable (article absent from the pool) → duplicate (article already seen)
 * → over-cap (qty exceeds the returnable quantity). The first failure short-circuits.
 *
 * On success, lines are priced at each product's latest paid unit price
 * (`lineTotalPaisas(qty, unitPricePaisas)`), the credit total is accumulated, and a
 * snapshot row is produced per line.
 */
export function validateReturnItems(
  items: ReturnLineInput[],
  returnableByArticle: ReturnablePool,
): ValidateReturnResult {
  const seen = new Set<string>();
  let amountPaisas = 0n;
  const snapshots: ReturnSnapshotItem[] = [];

  for (const it of items) {
    const r = returnableByArticle.get(it.articleNumber);
    if (!r) {
      return {
        ok: false,
        error: "not-returnable",
        articleNumber: it.articleNumber,
      };
    }
    if (seen.has(it.articleNumber)) {
      return { ok: false, error: "duplicate", articleNumber: it.articleNumber };
    }
    seen.add(it.articleNumber);
    if (it.qty > r.returnableQty) {
      return { ok: false, error: "over-cap", articleNumber: it.articleNumber };
    }
    amountPaisas += lineTotalPaisas(it.qty, r.latestUnitPricePaisas);
    snapshots.push(createReturnLineSnapshot(r, it.qty));
  }

  return { ok: true, items: snapshots, amountPaisas };
}

/**
 * Sum the credit value of return lines priced at each product's latest paid unit
 * price. Lines whose article is absent from the pool contribute nothing — this
 * mirrors the form's live total, which ignores unmatched lines rather than failing.
 */
export function calculateReturnTotal(
  items: ReturnLineInput[],
  returnableByArticle: ReturnablePool,
): bigint {
  let total = 0n;
  for (const it of items) {
    const r = returnableByArticle.get(it.articleNumber);
    if (!r) continue;
    total += lineTotalPaisas(it.qty, r.latestUnitPricePaisas);
  }
  return total;
}

/**
 * Decide a new return bill's status. An admin's return settles immediately
 * (mirroring today's behaviour); a user's return needs admin approval first —
 * the same trust boundary as an over-limit sale bill, applied unconditionally
 * here since a return has no credit-limit threshold to test against.
 */
export function computeReturnBillStatus(
  isAdmin: boolean,
): "paid" | "pending_approval" {
  return isAdmin ? "paid" : "pending_approval";
}
