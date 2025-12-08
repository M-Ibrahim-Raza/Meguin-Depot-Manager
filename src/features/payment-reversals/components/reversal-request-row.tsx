"use client";

import { ShieldCheck, Undo2 } from "lucide-react";
import { ApprovalBadge } from "@/components/approval-badge";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import type { ReversalWithContext } from "@/server/db/repos/payment-reversals.repo";

type Props = {
  reversal: ReversalWithContext;
  onReview: (reversal: ReversalWithContext) => void;
};

export function ReversalRequestRow({ reversal, onReview }: Props) {
  return (
    <Card className="border-amber-200 p-4">
      <div className="flex items-start gap-3">
        <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
          <Undo2 className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              {reversal.customerName}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {reversal.reversalNo}
            </Badge>
            <span className="text-muted-foreground text-xs">
              against {reversal.payId}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ApprovalBadge approval="pending" />
            <span className="text-muted-foreground text-xs">
              requested {fmtDate(reversal.requestedAt as unknown as string)}
            </span>
          </div>
          <p className="text-muted-foreground mt-1.5 text-xs">
            &quot;{reversal.reason}&quot;
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-col items-end">
            <Money
              paisas={reversal.amountPaisas}
              className="text-lg font-bold"
            />
            <span className="text-muted-foreground text-xs">
              of <Money paisas={reversal.paymentAmountPaisas} /> paid
            </span>
          </div>
          <Button size="sm" onClick={() => onReview(reversal)}>
            <ShieldCheck className="size-4" />
            Review
          </Button>
        </div>
      </div>
    </Card>
  );
}
