"use client";

import { TriangleAlert } from "lucide-react";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fmtQty } from "@/features/stock/lib";

/** One offending line shown in the over-returnable warning list. */
export type OverReturnLine = {
  articleNumber: string;
  name: string;
  unit: string;
  qty: number;
  returnable: number;
};

type Props = {
  totalPaisas: bigint;
  projectedOutstanding: bigint;
  createsCredit: boolean;
  blocked: boolean;
  overReturn: OverReturnLine[];
  isPending: boolean;
  lineCount: number;
  nextReturnNoPreview: string;
  /** Whether the current user is an admin — an admin's return settles
   * immediately; anyone else's is submitted for admin approval. */
  isAdmin: boolean;
};

export function ReturnTotalsFooter({
  totalPaisas,
  projectedOutstanding,
  createsCredit,
  blocked,
  overReturn,
  isPending,
  lineCount,
  nextReturnNoPreview,
  isAdmin,
}: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Credit total</span>
          <Money
            paisas={totalPaisas}
            className="text-destructive text-2xl font-bold"
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Projected outstanding after return
          </span>
          <Money paisas={projectedOutstanding} className="font-semibold" />
        </div>
        {!isAdmin ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>This return will be submitted for admin approval.</div>
          </div>
        ) : null}
        {createsCredit ? (
          <div className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
            This return exceeds the outstanding balance — the customer will hold
            a store credit of{" "}
            <span className="text-foreground font-semibold">
              <Money paisas={-projectedOutstanding} />
            </span>
            .
          </div>
        ) : null}
        {blocked ? (
          <div className="text-destructive flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
            <div className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                These lines exceed the returnable quantity:
                <ul className="mt-1 list-inside list-disc">
                  {overReturn.map((s) => (
                    <li key={s.articleNumber}>
                      {s.name} — returning {fmtQty(s.qty)}, only{" "}
                      {fmtQty(s.returnable)} {s.unit} returnable
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
        <Button
          type="submit"
          disabled={isPending || lineCount === 0 || blocked}
          className="self-end"
        >
          {isPending
            ? "Submitting return…"
            : isAdmin
              ? `Create return #${nextReturnNoPreview}`
              : `Submit Return for Approval #${nextReturnNoPreview}`}
        </Button>
      </CardContent>
    </Card>
  );
}
