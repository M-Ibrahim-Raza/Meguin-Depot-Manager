"use client";

import { FileText, Receipt, ScrollText, Undo2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomerFormDialog } from "@/features/customers/components/customer-form-dialog";
import { BillApprovalDialog } from "@/features/bills/components/bill-approval-dialog";
import { BillDetailSheet } from "@/features/bills/components/bill-detail-sheet";
import { ApprovalDialog } from "@/features/payments/components/approval-dialog";
import { RequestReversalDialog } from "@/features/payment-reversals/components/request-reversal-dialog";
import { groupReversalsByPayment } from "@/features/payment-reversals/lib";
import { ReturnBillApprovalDialog } from "@/features/returns/components/return-bill-approval-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatus } from "@/lib/format";
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";
import type { ReturnBillWithCreator } from "@/server/db/repos/customers.repo";
import type {
  Bill,
  Customer,
  Payment,
  PaymentReversal,
} from "@/server/db/schema";
import type { ExportColumnMeta } from "@/server/export/types";
import { BillsPanel } from "./customer-detail/bills-panel";
import { CreditSummaryCard } from "./customer-detail/credit-summary-card";
import { CustomerDetailHeader } from "./customer-detail/customer-detail-header";
import { InfoPanel } from "./customer-detail/info-panel";
import { LedgerPanel } from "./customer-detail/ledger-panel";
import { PaymentsPanel } from "./customer-detail/payments-panel";
import { ReturnBillsPanel } from "./customer-detail/return-bills-panel";

type Props = {
  customer: Customer;
  bills: Bill[];
  returnBills: ReturnBillWithCreator[];
  payments: Payment[];
  reversals: PaymentReversal[];
  canEdit?: boolean;
  /** Whether the current user (admin) may approve/reject bills, payments, and return bills. */
  canManageApprovals?: boolean;
  /** Bill export columns (admin only); enables the per-customer bills + return bills export. */
  billExportColumns?: ExportColumnMeta[];
  /** Payment export columns (admin only); enables the per-customer payments export. */
  paymentExportColumns?: ExportColumnMeta[];
  /** Ledger export columns (admin only); enables the per-customer ledger export. */
  ledgerExportColumns?: ExportColumnMeta[];
};

export function CustomerDetail({
  customer,
  bills,
  returnBills,
  payments,
  reversals,
  canEdit = false,
  canManageApprovals = false,
  billExportColumns,
  paymentExportColumns,
  ledgerExportColumns,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState("ledger");
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<{
    bill: Bill;
    customerName: string;
  } | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<{
    billId: number;
    customerId: number;
  } | null>(null);
  const [returnApprovalDialogOpen, setReturnApprovalDialogOpen] =
    useState(false);
  const [selectedReturnBill, setSelectedReturnBill] = useState<{
    bill: ReturnBillWithCreator;
    customerName: string;
  } | null>(null);
  const [paymentApprovalOpen, setPaymentApprovalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] =
    useState<PaymentWithCustomer | null>(null);
  const [requestingReversal, setRequestingReversal] =
    useState<PaymentWithCustomer | null>(null);
  const reversalsByPayment = useMemo(
    () => groupReversalsByPayment(reversals),
    [reversals],
  );
  const status = getStatus(
    customer.outstandingPaisas,
    customer.creditLimitPaisas,
  );

  const pendingBills = bills.filter((b) => b.status === "pending_approval");
  const pendingPayments = payments.filter((p) => p.approval === "pending");
  const pendingReturnBills = returnBills.filter(
    (b) => b.status === "pending_approval",
  );

  function openPaymentReview(payment: Payment) {
    setSelectedPayment({
      ...payment,
      customerName: customer.name,
      customerArea: customer.area,
    });
    setPaymentApprovalOpen(true);
  }

  function openReversalRequest(payment: Payment) {
    setRequestingReversal({
      ...payment,
      customerName: customer.name,
      customerArea: customer.area,
    });
  }
  const pendingPaisas = pendingBills.reduce(
    (sum, b) => sum + b.amountPaisas,
    0n,
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <CustomerDetailHeader
        customer={customer}
        status={status}
        pendingBillsCount={pendingBills.length}
        pendingPaymentsCount={pendingPayments.length}
        pendingReturnBillsCount={pendingReturnBills.length}
        canEdit={canEdit}
        onEdit={() => setEditOpen(true)}
      />

      <CreditSummaryCard customer={customer} pendingPaisas={pendingPaisas} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="ledger">
              <ScrollText className="size-4" />
              Ledger
            </TabsTrigger>
            <TabsTrigger value="payments">
              <Wallet className="size-4" />
              Payments ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="bills">
              <Receipt className="size-4" />
              Bills ({bills.length})
            </TabsTrigger>
            <TabsTrigger value="return-bills">
              <Undo2 className="size-4" />
              Return Bills ({returnBills.length})
            </TabsTrigger>
          </TabsList>

          {/* Info is its own pill, independent of the list on the left. It drives
              the same controlled tab value, so its panel still toggles correctly. */}
          <div className="bg-muted inline-flex h-8 items-center rounded-lg p-[3px]">
            <button
              type="button"
              onClick={() => setTab("info")}
              data-active={tab === "info" ? "" : undefined}
              className="text-foreground/60 hover:text-foreground data-active:bg-background data-active:text-foreground inline-flex h-[calc(100%-1px)] items-center gap-1.5 rounded-md border border-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-all data-active:shadow-sm"
            >
              <FileText className="size-4" />
              Info
            </button>
          </div>
        </div>

        <TabsContent value="ledger" className="mt-4">
          <LedgerPanel
            bills={bills}
            returnBills={returnBills}
            payments={payments}
            reversals={reversals}
            customerId={customer.id}
            ledgerExportColumns={ledgerExportColumns}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentsPanel
            payments={payments}
            customerId={customer.id}
            canManageApprovals={canManageApprovals}
            paymentExportColumns={paymentExportColumns}
            onReviewPayment={openPaymentReview}
            reversalsByPayment={reversalsByPayment}
            onRequestReversal={openReversalRequest}
          />
        </TabsContent>

        <TabsContent value="bills" className="mt-4">
          <BillsPanel
            bills={bills}
            customerId={customer.id}
            customerName={customer.name}
            canManageApprovals={canManageApprovals}
            billExportColumns={billExportColumns}
            onApproveBill={(data) => {
              setSelectedBill(data);
              setApprovalDialogOpen(true);
            }}
            onViewBill={(bill) => {
              setViewingBill({ billId: bill.id, customerId: bill.customerId });
              setDetailSheetOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="return-bills" className="mt-4">
          <ReturnBillsPanel
            returnBills={returnBills}
            customerId={customer.id}
            customerName={customer.name}
            canManageApprovals={canManageApprovals}
            billExportColumns={billExportColumns}
            onApproveReturnBill={(data) => {
              setSelectedReturnBill(data);
              setReturnApprovalDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <InfoPanel customer={customer} />
        </TabsContent>
      </Tabs>

      {canEdit ? (
        <CustomerFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          customer={customer}
        />
      ) : null}

      <BillApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        data={selectedBill}
      />

      <ReturnBillApprovalDialog
        open={returnApprovalDialogOpen}
        onOpenChange={setReturnApprovalDialogOpen}
        data={selectedReturnBill}
      />

      <BillDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        target={viewingBill}
      />

      <ApprovalDialog
        key={selectedPayment?.id}
        open={paymentApprovalOpen}
        onOpenChange={setPaymentApprovalOpen}
        payment={selectedPayment}
      />

      <RequestReversalDialog
        key={requestingReversal ? `req-${requestingReversal.id}` : "req-closed"}
        open={!!requestingReversal}
        onOpenChange={(o) => !o && setRequestingReversal(null)}
        payment={requestingReversal}
        existingReversals={
          reversalsByPayment.get(requestingReversal?.id ?? -1) ?? []
        }
      />
    </div>
  );
}
