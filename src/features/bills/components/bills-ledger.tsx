"use client";

import { Clock, Plus, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { KpiCard } from "@/components/kpi-card";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BillApprovalDialog } from "@/features/bills/components/bill-approval-dialog";
import { ReturnBillApprovalDialog } from "@/features/returns/components/return-bill-approval-dialog";
import type { BillWithCustomer } from "@/server/db/repos/bills.repo";
import type { Customer } from "@/server/db/schema";
import type { ExportColumnMeta } from "@/server/export/types";
import { filterBills } from "../lib";
import { BillsExportButton } from "./bills-export-button";
import { BillsFilters } from "./bills-filters";
import { GlobalBillRow } from "./global-bill-row";
import { NewBillDialog } from "./new-bill-dialog";

type Props = {
  bills: BillWithCustomer[];
  customers: Customer[];
  isAdmin: boolean;
  exportColumns?: ExportColumnMeta[];
};

export function BillsLedger({
  bills,
  customers,
  isAdmin,
  exportColumns,
}: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("all");
  const [direction, setDirection] = useState("all");
  const [customerId, setCustomerId] = useState("all");
  const [search, setSearch] = useState("");

  const [selectedBill, setSelectedBill] = useState<{
    bill: BillWithCustomer;
    customerName: string;
  } | null>(null);
  const [selectedReturnBill, setSelectedReturnBill] = useState<{
    bill: BillWithCustomer & { createdByName: string | null };
    customerName: string;
  } | null>(null);
  const [newBillOpen, setNewBillOpen] = useState(false);

  const filtered = useMemo(
    () =>
      filterBills(bills, {
        search,
        status,
        direction,
        customerId,
        dateFrom,
        dateTo,
      }),
    [bills, search, status, direction, customerId, dateFrom, dateTo],
  );

  const pendingBills = useMemo(
    () => filtered.filter((b) => b.status === "pending_approval"),
    [filtered],
  );
  const regularBills = useMemo(
    () => filtered.filter((b) => b.status === "paid" || b.status === "unpaid"),
    [filtered],
  );
  const rejectedBills = useMemo(
    () => filtered.filter((b) => b.status === "rejected"),
    [filtered],
  );

  const totalPaisas = useMemo(
    () =>
      filtered
        .filter((b) => b.status !== "rejected")
        .reduce((s, b) => s + b.amountPaisas, 0n),
    [filtered],
  );

  const todayYmd = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayBills = useMemo(
    () => filtered.filter((b) => b.date === todayYmd),
    [filtered, todayYmd],
  );
  const todayTotalPaisas = useMemo(
    () => todayBills.reduce((s, b) => s + b.amountPaisas, 0n),
    [todayBills],
  );

  const hasActiveFilter =
    dateFrom !== "" ||
    dateTo !== "" ||
    search !== "" ||
    status !== "all" ||
    direction !== "all" ||
    customerId !== "all";

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setStatus("all");
    setDirection("all");
    setCustomerId("all");
  }

  function handleApprove(bill: BillWithCustomer) {
    if (bill.direction === "return") {
      setSelectedReturnBill({
        bill: { ...bill, createdByName: null },
        customerName: bill.customerName,
      });
    } else {
      setSelectedBill({ bill, customerName: bill.customerName });
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bills</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every sale and return bill across all customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && exportColumns ? (
            <BillsExportButton
              columns={exportColumns}
              customers={customers}
              initialFilters={{
                search,
                status,
                direction,
                customerId,
                dateFrom,
                dateTo,
              }}
            />
          ) : null}
          <Button onClick={() => setNewBillOpen(true)}>
            <Plus className="size-4" />
            New Bill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total Bills"
          value={filtered.length}
          sub={`of ${bills.length} total`}
        />
        <KpiCard
          label="Pending Approval"
          value={pendingBills.length}
          tone="text-amber-700"
          Icon={Clock}
        />
        <KpiCard
          label="Filtered Total"
          value={<Money paisas={totalPaisas} />}
        />
        <KpiCard
          label="Today's Bills"
          value={todayBills.length}
          sub={<Money paisas={todayTotalPaisas} />}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <BillsFilters
            customers={customers}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            search={search}
            setSearch={setSearch}
            customerId={customerId}
            setCustomerId={setCustomerId}
            status={status}
            setStatus={setStatus}
            direction={direction}
            setDirection={setDirection}
            hasActiveFilter={hasActiveFilter}
            clearFilters={clearFilters}
          />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Receipt className="size-8" />
          <p className="text-sm">
            {bills.length === 0
              ? "No bills recorded yet."
              : "No bills match these filters."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {pendingBills.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1 text-sm font-semibold text-amber-700">
                <div className="size-2 rounded-full bg-amber-500" />
                Pending Approval ({pendingBills.length})
              </div>
              {pendingBills.map((b) => (
                <GlobalBillRow
                  key={`${b.direction}-${b.id}`}
                  bill={b}
                  canApprove={isAdmin}
                  onApprove={handleApprove}
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
                <GlobalBillRow
                  key={`${b.direction}-${b.id}`}
                  bill={b}
                  canApprove={isAdmin}
                  onApprove={handleApprove}
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
                    <GlobalBillRow
                      key={`${b.direction}-${b.id}`}
                      bill={b}
                      canApprove={isAdmin}
                      onApprove={handleApprove}
                    />
                  ))}
                </div>
              </details>
            </div>
          ) : null}
        </div>
      )}

      <BillApprovalDialog
        key={selectedBill ? `bill-${selectedBill.bill.id}` : "bill-closed"}
        open={!!selectedBill}
        onOpenChange={(o) => !o && setSelectedBill(null)}
        data={selectedBill}
      />
      <ReturnBillApprovalDialog
        key={
          selectedReturnBill
            ? `return-${selectedReturnBill.bill.id}`
            : "return-closed"
        }
        open={!!selectedReturnBill}
        onOpenChange={(o) => !o && setSelectedReturnBill(null)}
        data={selectedReturnBill}
      />
      <NewBillDialog
        open={newBillOpen}
        onOpenChange={setNewBillOpen}
        customers={customers}
      />
    </div>
  );
}
