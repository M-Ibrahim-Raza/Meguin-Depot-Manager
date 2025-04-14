"use client";

import { Undo2 } from "lucide-react";
import { ApprovalBadge } from "@/components/approval-badge";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReversalStatusLine } from "@/features/payment-reversals/components/reversal-status-line";
import { formatApprovalMeta } from "@/features/payments/lib";
import {
  PAYMENT_METHOD_LABELS,
  type ApprovalStatus,
  type PaymentMethod,
} from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { Payment } from "@/server/db/schema";

export function PaymentRow({
  payment,
  canApprove = false,
  onReviewClick,
  reversedApprovedPaisas = 0n,
  hasPendingReversal = false,
  onRequestReversal,
}: {
  payment: Payment;
  canApprove?: boolean;
  onReviewClick?: () => void;
  /** Sum of this payment's approved reversals — 0 if none. */
  reversedApprovedPaisas?: bigint;
  /** Whether a reversal request against this payment still awaits admin review. */
  hasPendingReversal?: boolean;
  /** Any user may request a reversal of an approved payment — omit to hide the action. */
  onRequestReversal?: () => void;
}) {
  const isPending = payment.approval === "pending";
  const remainingReversiblePaisas =
    payment.amountPaisas - reversedApprovedPaisas;
  const isFullyReversed =
    payment.approval === "approved" && remainingReversiblePaisas <= 0n;
  const hasReversalActivity =
    payment.approval === "approved" && reversedApprovedPaisas > 0n;
  const canRequestReversal =
    !!onRequestReversal &&
    payment.approval === "approved" &&
    !hasPendingReversal &&
    remainingReversiblePaisas > 0n;

  return (
    <Card className="flex flex-row items-start justify-between gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{payment.payId}</span>
          <Badge variant="secondary">
            {PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ??
              payment.method}
          </Badge>
          <ApprovalBadge approval={payment.approval as ApprovalStatus} />
        </div>
        <div className="text-muted-foreground mt-1 text-xs">
          {fmtDate(payment.date)}
          {payment.note ? ` · ${payment.note}` : ""}
        </div>
        {payment.approvedBy ? (
          <div className="text-muted-foreground mt-1 text-xs">
            {formatApprovalMeta(payment)}
          </div>
        ) : null}
        <ReversalStatusLine
          className="mt-1"
          amountPaisas={payment.amountPaisas}
          reversedApprovedPaisas={reversedApprovedPaisas}
          hasPendingReversal={hasPendingReversal}
        />
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-col items-end">
          {hasReversalActivity ? (
            <Money
              paisas={payment.amountPaisas}
              className="text-muted-foreground text-xs line-through"
            />
          ) : null}
          <Money
            paisas={
              hasReversalActivity
                ? remainingReversiblePaisas
                : payment.amountPaisas
            }
            className={
              isFullyReversed
                ? "text-muted-foreground text-base font-bold"
                : "text-base font-bold"
            }
          />
        </div>
        {isPending && canApprove ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={onReviewClick}
          >
            Review
          </Button>
        ) : null}
        {hasPendingReversal ? (
          <span className="text-muted-foreground text-xs">
            Reversal pending
          </span>
        ) : canRequestReversal ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={onRequestReversal}
          >
            <Undo2 className="size-3.5" />
            Reverse
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
