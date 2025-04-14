"use client";

import { useMemo } from "react";
import { PaymentsExportButton } from "@/features/payments/components/payments-export-button";
import { summarizePaymentReversals } from "@/features/payment-reversals/lib";
import type { Payment, PaymentReversal } from "@/server/db/schema";
import type { ExportColumnMeta } from "@/server/export/types";
import { EmptyState } from "./empty-state";
import { PaymentRow } from "./payment-row";

type Props = {
  payments: Payment[];
  customerId: number;
  canManageApprovals: boolean;
  paymentExportColumns?: ExportColumnMeta[];
  onReviewPayment: (payment: Payment) => void;
  reversalsByPayment: Map<number, PaymentReversal[]>;
  onRequestReversal: (payment: Payment) => void;
};

export function PaymentsPanel({
  payments,
  customerId,
  canManageApprovals,
  paymentExportColumns,
  onReviewPayment,
  reversalsByPayment,
  onRequestReversal,
}: Props) {
  const pendingPayments = useMemo(
    () => payments.filter((p) => p.approval === "pending"),
    [payments],
  );
  const otherPayments = useMemo(
    () => payments.filter((p) => p.approval !== "pending"),
    [payments],
  );

  return (
    <>
      {canManageApprovals && paymentExportColumns ? (
        <div className="mb-4 flex justify-end">
          <PaymentsExportButton
            columns={paymentExportColumns}
            customerId={customerId}
            size="sm"
          />
        </div>
      ) : null}
      {payments.length === 0 ? (
        <EmptyState>No payments recorded.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {pendingPayments.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1 text-sm font-semibold text-amber-700">
                <div className="size-2 rounded-full bg-amber-500" />
                Pending Approval ({pendingPayments.length})
              </div>
              {pendingPayments.map((p) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  canApprove={canManageApprovals}
                  onReviewClick={() => onReviewPayment(p)}
                />
              ))}
            </div>
          ) : null}

          {otherPayments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {pendingPayments.length > 0 ? (
                <div className="text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase">
                  Payments
                </div>
              ) : null}
              {otherPayments.map((p) => {
                const { reversedApprovedPaisas, hasPendingReversal } =
                  summarizePaymentReversals(reversalsByPayment.get(p.id) ?? []);
                return (
                  <PaymentRow
                    key={p.id}
                    payment={p}
                    reversedApprovedPaisas={reversedApprovedPaisas}
                    hasPendingReversal={hasPendingReversal}
                    onRequestReversal={() => onRequestReversal(p)}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
