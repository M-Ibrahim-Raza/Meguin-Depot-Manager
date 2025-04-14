"use client";

import { useMemo } from "react";
import { BillsExportButton } from "@/features/bills/components/bills-export-button";
import type { Bill } from "@/server/db/schema";
import type { ExportColumnMeta } from "@/server/export/types";
import { BillRow } from "./bill-row";
import { EmptyState } from "./empty-state";

type Props = {
  bills: Bill[];
  customerId: number;
  customerName: string;
  canManageApprovals: boolean;
  billExportColumns?: ExportColumnMeta[];
  onApproveBill: (data: { bill: Bill; customerName: string }) => void;
  onViewBill: (bill: Bill) => void;
};

export function BillsPanel({
  bills,
  customerId,
  customerName,
  canManageApprovals,
  billExportColumns,
  onApproveBill,
  onViewBill,
}: Props) {
  const pendingBills = useMemo(
    () => bills.filter((b) => b.status === "pending_approval"),
    [bills],
  );
  const regularBills = useMemo(
    () => bills.filter((b) => b.status === "paid" || b.status === "unpaid"),
    [bills],
  );
  const rejectedBills = useMemo(
    () => bills.filter((b) => b.status === "rejected"),
    [bills],
  );

  return (
    <>
      {canManageApprovals && billExportColumns ? (
        <div className="mb-4 flex justify-end">
          <BillsExportButton
            columns={billExportColumns}
            customerId={customerId}
            size="sm"
          />
        </div>
      ) : null}
      {bills.length === 0 ? (
        <EmptyState>No bills yet.</EmptyState>
      ) : (
        <div className="flex flex-col gap-6">
          {pendingBills.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1 text-sm font-semibold text-amber-700">
                <div className="size-2 rounded-full bg-amber-500" />
                Pending Approval ({pendingBills.length})
              </div>
              {pendingBills.map((b) => (
                <BillRow
                  key={b.id}
                  bill={b}
                  canApprove={canManageApprovals}
                  onApproveClick={() => {
                    onApproveBill({
                      bill: b,
                      customerName,
                    });
                  }}
                  onViewClick={() => onViewBill(b)}
                />
              ))}
            </div>
          ) : null}

          {regularBills.length > 0 ? (
            <div className="flex flex-col gap-2">
              {pendingBills.length > 0 ? (
                <div className="text-muted-foreground px-1 text-xs font-semibold tracking-wider uppercase">
                  Bills
                </div>
              ) : null}
              {regularBills.map((b) => (
                <BillRow
                  key={b.id}
                  bill={b}
                  onViewClick={() => onViewBill(b)}
                />
              ))}
            </div>
          ) : null}

          {rejectedBills.length > 0 ? (
            <div className="flex flex-col gap-2">
              <details className="cursor-pointer">
                <summary className="flex items-center gap-2 px-1 text-sm font-semibold text-red-700">
                  <div className="size-2 rounded-full bg-red-500" />
                  Rejected Bills ({rejectedBills.length})
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {rejectedBills.map((b) => (
                    <BillRow
                      key={b.id}
                      bill={b}
                      onViewClick={() => onViewBill(b)}
                    />
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
