"use client";

import { TriangleAlert } from "lucide-react";
import { Money } from "@/components/money";
import { MoneyDelta } from "@/components/money-delta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  InsufficientStockAlert,
  type StockIssue,
} from "./insufficient-stock-alert";

type Props = {
  totalPaisas: bigint;
  /** Extra revenue baked into `totalPaisas` from lines sold above list. */
  totalUpsellPaisas: bigint;
  projectedOutstanding: bigint;
  type: "cash" | "deferred";
  overLimit: boolean;
  hasPendingBill?: boolean;
  canOverride: boolean;
  hasStockIssue: boolean;
  stockIssues: StockIssue[];
  override: boolean;
  onOverrideChange: (value: boolean) => void;
  isPending: boolean;
  lineCount: number;
  blockedByStock: boolean;
  /** A line's entered price undercuts its listed price — shouldn't happen
   * given the UI's own floor-clamp, but blocks submit as a last resort. */
  blockedByUpsell: boolean;
  nextBillNoPreview: string;
};

/** The bill summary card: total, projected outstanding, warnings, and submit. */
export function BillSummary({
  totalPaisas,
  totalUpsellPaisas,
  projectedOutstanding,
  type,
  overLimit,
  hasPendingBill,
  canOverride,
  hasStockIssue,
  stockIssues,
  override,
  onOverrideChange,
  isPending,
  lineCount,
  blockedByStock,
  blockedByUpsell,
  nextBillNoPreview,
}: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Total</span>
          <Money paisas={totalPaisas} className="text-2xl font-bold" />
        </div>
        {totalUpsellPaisas > 0n ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">From price increases</span>
            <MoneyDelta paisas={totalUpsellPaisas} />
          </div>
        ) : null}
        {type === "deferred" ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Projected outstanding after this bill
            </span>
            <Money
              paisas={projectedOutstanding}
              className={cn(
                "font-semibold",
                overLimit ? "text-destructive" : undefined,
              )}
            />
          </div>
        ) : null}
        {hasPendingBill ? (
          <div className="text-destructive flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />A bill is
            already pending approval for this customer. Wait for approval or
            rejection before creating another.
          </div>
        ) : null}
        {overLimit && !hasPendingBill ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              {canOverride
                ? "This bill exceeds the credit limit and will be auto-approved."
                : "This bill exceeds the credit limit and will be submitted for admin approval."}
            </div>
          </div>
        ) : null}
        {hasStockIssue ? (
          <InsufficientStockAlert
            stockIssues={stockIssues}
            canOverride={canOverride}
            override={override}
            onOverrideChange={onOverrideChange}
          />
        ) : null}
        <Button
          type="submit"
          disabled={
            isPending ||
            lineCount === 0 ||
            hasPendingBill ||
            blockedByStock ||
            blockedByUpsell
          }
          className="self-end"
        >
          {isPending
            ? "Creating bill…"
            : overLimit && !canOverride
              ? `Submit for Approval #${nextBillNoPreview}`
              : `Create bill #${nextBillNoPreview}`}
        </Button>
      </CardContent>
    </Card>
  );
}
