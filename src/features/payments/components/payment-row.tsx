"use client";

import {
  Banknote,
  CreditCard,
  Landmark,
  Smartphone,
  ShieldCheck,
  Undo2,
} from "lucide-react";
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
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";

type Props = {
  payment: PaymentWithCustomer;
  canApprove: boolean;
  onReview: (payment: PaymentWithCustomer) => void;
  /** Sum of this payment's approved reversals — 0 if none requested/approved. */
  reversedApprovedPaisas?: bigint;
  /** Whether a reversal request against this payment still awaits admin review. */
  hasPendingReversal?: boolean;
  /** Any user may request a reversal of an approved payment — omit to hide the action. */
  onRequestReversal?: (payment: PaymentWithCustomer) => void;
};

const METHOD_ICONS: Record<
  PaymentMethod,
  React.ComponentType<{ className?: string }>
> = {
  cash: Banknote,
  bank: Landmark,
  cheque: CreditCard,
  online: Smartphone,
};

export function PaymentRow({
  payment,
  canApprove,
  onReview,
  reversedApprovedPaisas = 0n,
  hasPendingReversal = false,
  onRequestReversal,
}: Props) {
  const approval = payment.approval as ApprovalStatus;
  const method = payment.method as PaymentMethod;
  const Icon = METHOD_ICONS[method] ?? Banknote;
  const isPending = approval === "pending";
  const remainingReversiblePaisas =
    payment.amountPaisas - reversedApprovedPaisas;
  const isFullyReversed =
    approval === "approved" && remainingReversiblePaisas <= 0n;
  const hasReversalActivity =
    approval === "approved" && reversedApprovedPaisas > 0n;
  const canRequestReversal =
    !!onRequestReversal &&
    approval === "approved" &&
    !hasPendingReversal &&
    remainingReversiblePaisas > 0n;

  return (
    <Card
      className={
        isPending
          ? "border-amber-200 p-4"
          : approval === "approved"
            ? "border-emerald-100 p-4"
            : "border-red-100 p-4"
      }
    >
      <div className="flex items-start gap-3">
        <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">
              {payment.customerName}
            </span>
            <span className="text-muted-foreground text-xs">
              {payment.customerArea}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {payment.payId}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {PAYMENT_METHOD_LABELS[method] ?? payment.method}
            </Badge>
            <ApprovalBadge approval={approval} />
            {payment.note ? (
              <span className="text-muted-foreground text-xs">
                {payment.note}
              </span>
            ) : null}
          </div>
          {payment.approvedBy ? (
            <div
              className={
                approval === "approved"
                  ? "mt-1.5 text-xs text-emerald-700"
                  : "mt-1.5 text-xs text-red-700"
              }
            >
              {formatApprovalMeta(payment)}
            </div>
          ) : null}
          <ReversalStatusLine
            className="mt-1.5"
            amountPaisas={payment.amountPaisas}
            reversedApprovedPaisas={reversedApprovedPaisas}
            hasPendingReversal={hasPendingReversal}
          />
        </div>
        <div className="flex flex-col items-end gap-2">
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
                approval === "rejected"
                  ? "text-muted-foreground text-lg"
                  : approval === "approved"
                    ? isFullyReversed
                      ? "text-muted-foreground text-lg"
                      : "text-lg font-bold text-emerald-700"
                    : "text-lg font-bold"
              }
            />
          </div>
          {isPending && canApprove ? (
            <Button size="sm" onClick={() => onReview(payment)}>
              <ShieldCheck className="size-4" />
              Review
            </Button>
          ) : null}
          {hasPendingReversal ? (
            <span className="text-muted-foreground text-xs">
              Reversal pending review
            </span>
          ) : canRequestReversal ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRequestReversal?.(payment)}
            >
              <Undo2 className="size-4" />
              Request reversal
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
