"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fmtQty } from "@/features/stock/lib";
import { transferRouteLabel } from "@/features/stock-transfers/lib";
import { STOCK_LOCATION_LABELS, type StockLocation } from "@/lib/constants";

type StockIssue = {
  articleNumber: string;
  name: string;
  unit: string;
  qty: number;
  available: number;
};

type Props = {
  fromLocation: StockLocation;
  toLocation: StockLocation;
  stockIssues: StockIssue[];
  hasStockIssue: boolean;
  lineCount: number;
  isPending: boolean;
  nextSlipNoPreview: string;
};

export function TransferSummary({
  fromLocation,
  toLocation,
  stockIssues,
  hasStockIssue,
  lineCount,
  isPending,
  nextSlipNoPreview,
}: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="text-muted-foreground text-sm">
          Moving {transferRouteLabel(fromLocation, toLocation)}
        </div>
        {hasStockIssue ? (
          <div className="text-destructive flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              Not enough stock at {STOCK_LOCATION_LABELS[fromLocation]} for:
              <ul className="mt-1 list-inside list-disc">
                {stockIssues.map((s) => (
                  <li key={s.articleNumber}>
                    {s.name} — need {fmtQty(s.qty)}, {fmtQty(s.available)}{" "}
                    {s.unit} available
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <Button
          type="submit"
          disabled={isPending || lineCount === 0 || hasStockIssue}
          className="self-end"
        >
          {isPending ? "Recording…" : `Record transfer #${nextSlipNoPreview}`}
        </Button>
      </CardContent>
    </Card>
  );
}
