"use client";

import { Plus, Undo2, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Money } from "@/components/money";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RequestReversalDialog } from "@/features/payment-reversals/components/request-reversal-dialog";
import {
  groupReversalsByPayment,
  paymentIdsWithPendingReversal,
  sumApprovedReversalsByPayment,
} from "@/features/payment-reversals/lib";
import { APPROVAL_STATUSES, PAYMENT_METHODS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";
import type { Customer, PaymentReversal } from "@/server/db/schema";
import type { ExportColumnMeta } from "@/server/export/types";
import { ExportButton } from "@/features/export/components/export-button";
import {
  calculatePaymentTotals,
  filterPayments,
  groupPaymentsByDate,
} from "../lib";
import { ApprovalDialog } from "./approval-dialog";
import { PaymentFilters } from "./payment-filters";
import { PaymentRow } from "./payment-row";
import { RecordPaymentDialog } from "./record-payment-dialog";

type Props = {
  payments: PaymentWithCustomer[];
  customers: Customer[];
  reversals: PaymentReversal[];
  isAdmin: boolean;
  exportColumns?: ExportColumnMeta[];
};

type ApprovalFilter = "all" | (typeof APPROVAL_STATUSES)[number];
type MethodFilter = "all" | (typeof PAYMENT_METHODS)[number];

export function PaymentsLedger({
  payments,
  customers,
  reversals,
  isAdmin,
  exportColumns,
}: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [approval, setApproval] = useState<ApprovalFilter>("all");
  const [method, setMethod] = useState<MethodFilter>("all");
  const [customerId, setCustomerId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [reviewing, setReviewing] = useState<PaymentWithCustomer | null>(null);
  const [requesting, setRequesting] = useState<PaymentWithCustomer | null>(
    null,
  );

  const reversalsByPayment = useMemo(
    () => groupReversalsByPayment(reversals),
    [reversals],
  );
  const reversedApprovedByPayment = useMemo(
    () => sumApprovedReversalsByPayment(reversals),
    [reversals],
  );
  const pendingReversalPaymentIds = useMemo(
    () => paymentIdsWithPendingReversal(reversals),
    [reversals],
  );

  const filtered = useMemo(
    () =>
      filterPayments(payments, {
        search,
        approval,
        method,
        customerId,
        dateFrom,
        dateTo,
      }),
    [payments, approval, method, customerId, dateFrom, dateTo, search],
  );

  const grouped = useMemo(() => groupPaymentsByDate(filtered), [filtered]);

  const { totalPaisas, approvedPaisas, reversedPaisas, pendingCount } = useMemo(
    () =>
      calculatePaymentTotals(
        filtered.map((p) => ({
          ...p,
          reversedApprovedPaisas: reversedApprovedByPayment.get(p.id) ?? 0n,
        })),
      ),
    [filtered, reversedApprovedByPayment],
  );

  const hasActiveFilter =
    dateFrom !== "" ||
    dateTo !== "" ||
    search !== "" ||
    approval !== "all" ||
    method !== "all" ||
    customerId !== "all";

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setApproval("all");
    setMethod("all");
    setCustomerId("all");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All payments across customers · approval tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
              {pendingCount} pending review
            </span>
          ) : null}
          {isAdmin ? (
            <Link
              href="/payments/reversals"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Undo2 className="size-4" />
              Reversal Requests
            </Link>
          ) : null}
          {isAdmin && exportColumns ? (
            <ExportButton
              resource="payments"
              title="Payments"
              columns={exportColumns}
              showDateRange
              initialFilters={{
                search,
                approval,
                method,
                customerId,
                dateFrom,
                dateTo,
              }}
            />
          ) : null}
          <Button onClick={() => setRecordOpen(true)}>
            <Plus className="size-4" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Filtered Total</div>
            <Money paisas={totalPaisas} className="mt-1 text-lg font-bold" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Approved Total</div>
            <Money
              paisas={approvedPaisas}
              className="mt-1 text-lg font-bold text-emerald-700"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Reversed</div>
            <Money
              paisas={reversedPaisas}
              className="text-muted-foreground mt-1 text-lg font-bold"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Pending</div>
            <div className="mt-1 text-lg font-bold text-amber-700">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Showing</div>
            <div className="mt-1 text-lg font-bold">
              {filtered.length} of {payments.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <PaymentFilters
            customers={customers}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            search={search}
            setSearch={setSearch}
            customerId={customerId}
            setCustomerId={setCustomerId}
            approval={approval}
            setApproval={setApproval}
            method={method}
            setMethod={setMethod}
            hasActiveFilter={hasActiveFilter}
            clearFilters={clearFilters}
          />
        </CardContent>
      </Card>

      {grouped.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Wallet className="size-8" />
          <p className="text-sm">
            {payments.length === 0
              ? "No payments recorded yet."
              : "No payments match these filters."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([date, rows]) => {
            const dayTotal = rows.reduce((s, p) => s + p.amountPaisas, 0n);
            return (
              <section key={date} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-semibold",
                    )}
                  >
                    {fmtDate(date)}
                  </div>
                  <div className="bg-border h-px flex-1" />
                  <span className="text-muted-foreground text-xs font-medium">
                    {rows.length} payment{rows.length === 1 ? "" : "s"} ·{" "}
                    <Money paisas={dayTotal} />
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {rows.map((p) => (
                    <PaymentRow
                      key={p.id}
                      payment={p}
                      canApprove={isAdmin}
                      onReview={setReviewing}
                      reversedApprovedPaisas={
                        reversedApprovedByPayment.get(p.id) ?? 0n
                      }
                      hasPendingReversal={pendingReversalPaymentIds.has(p.id)}
                      onRequestReversal={setRequesting}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        customers={customers}
      />
      <ApprovalDialog
        key={reviewing?.id ?? "closed"}
        open={!!reviewing}
        onOpenChange={(o) => !o && setReviewing(null)}
        payment={reviewing}
      />
      <RequestReversalDialog
        key={requesting ? `requesting-${requesting.id}` : "requesting-closed"}
        open={!!requesting}
        onOpenChange={(o) => !o && setRequesting(null)}
        payment={requesting}
        existingReversals={reversalsByPayment.get(requesting?.id ?? -1) ?? []}
      />
    </div>
  );
}
