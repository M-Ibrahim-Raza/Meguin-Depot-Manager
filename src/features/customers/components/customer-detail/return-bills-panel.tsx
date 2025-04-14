"use client";

import { useMemo } from "react";
import { BillsExportButton } from "@/features/bills/components/bills-export-button";
import { ReturnBillRow } from "@/features/returns/components/return-bill-row";
import type { ReturnBillWithCreator } from "@/server/db/repos/customers.repo";
import type { ExportColumnMeta } from "@/server/export/types";
import { EmptyState } from "./empty-state";

type Props = {
  returnBills: ReturnBillWithCreator[];
  customerId: number;
  customerName: string;
  canManageApprovals: boolean;
  billExportColumns?: ExportColumnMeta[];
  onApproveReturnBill: (data: {
    bill: ReturnBillWithCreator;
    customerName: string;
  }) => void;
};

export function ReturnBillsPanel({
  returnBills,
  customerId,
  customerName,
  canManageApprovals,
  billExportColumns,
  onApproveReturnBill,
}: Props) {
  const pendingReturnBills = useMemo(
    () => returnBills.filter((b) => b.status === "pending_approval"),
    [returnBills],
  );
  const regularReturnBills = useMemo(
    () => returnBills.filter((b) => b.status === "paid"),
    [returnBills],
  );
  const rejectedReturnBills = useMemo(
    () => returnBills.filter((b) => b.status === "rejected"),
    [returnBills],
  );

  return (
    <>
      {canManageApprovals && billExportColumns ? (
        <div className="mb-4 flex justify-end">
          <BillsExportButton
            columns={billExportColumns}
            customerId={customerId}
            lockDirection="return"
            size="sm"
          />
        </div>
      ) : null}
      {returnBills.length === 0 ? (
        <EmptyState>No return bills yet.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {pendingReturnBills.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1 text-sm font-semibold text-amber-700">
                <div className="size-2 rounded-full bg-amber-500" />
                Pending Approval ({pendingReturnBills.length})
              </div>
              {pendingReturnBills.map((b) => (
                <ReturnBillRow
                  key={b.id}
                  bill={b}
                  canApprove={canManageApprovals}
                  onApproveClick={() => {
                    onApproveReturnBill({ bill: b, customerName });
                  }}
                />
              ))}
            </div>
          ) : null}

          {regularReturnBills.length > 0 ? (
            <div className="flex flex-col gap-2">
              {pendingReturnBills.length > 0 ? (
                <div className="text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase">
                  Return Bills
                </div>
              ) : null}
              {regularReturnBills.map((b) => (
                <ReturnBillRow key={b.id} bill={b} />
              ))}
            </div>
          ) : null}

          {rejectedReturnBills.length > 0 ? (
            <div className="flex flex-col gap-2">
              <details className="cursor-pointer">
                <summary className="flex items-center gap-2 px-1 text-sm font-semibold text-red-700">
                  <div className="size-2 rounded-full bg-red-500" />
                  Rejected Return Bills ({rejectedReturnBills.length})
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {rejectedReturnBills.map((b) => (
                    <ReturnBillRow key={b.id} bill={b} />
                  ))}
                </div>
              </details>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
