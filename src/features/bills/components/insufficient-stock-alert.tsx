"use client";

import { TriangleAlert } from "lucide-react";
import { fmtQty } from "@/features/stock/lib";
import { STOCK_LOCATION_LABELS, type StockLocation } from "@/lib/constants";

/** One unmet line as rendered in the alert: the article's name/unit plus the
 * requested vs. available quantities at a given location. */
export type StockIssue = {
  articleNumber: string;
  location: StockLocation;
  name: string;
  unit: string;
  qty: number;
  available: number;
};

type Props = {
  stockIssues: StockIssue[];
  /** Whether the current user (admin) may opt to sell past available stock. */
  canOverride: boolean;
  override: boolean;
  onOverrideChange: (value: boolean) => void;
};

/** The "insufficient stock" warning panel, with the admin-only override toggle. */
export function InsufficientStockAlert({
  stockIssues,
  canOverride,
  override,
  onOverrideChange,
}: Props) {
  return (
    <div className="text-destructive flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
        <div>
          Insufficient stock for:
          <ul className="mt-1 list-inside list-disc">
            {stockIssues.map((s) => (
              <li key={`${s.articleNumber}::${s.location}`}>
                {s.name} ({STOCK_LOCATION_LABELS[s.location]}) — need{" "}
                {fmtQty(s.qty)}, {fmtQty(s.available)} {s.unit} available
              </li>
            ))}
          </ul>
        </div>
      </div>
      {canOverride ? (
        <label className="text-foreground mt-1 flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={override}
            onChange={(e) => onOverrideChange(e.target.checked)}
            className="size-4 accent-current"
          />
          Sell anyway (stock will go negative)
        </label>
      ) : null}
    </div>
  );
}
