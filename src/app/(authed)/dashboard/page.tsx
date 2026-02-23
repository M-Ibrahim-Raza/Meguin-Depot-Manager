import {
  Banknote,
  ClipboardCheck,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { ApprovalBadge } from "@/components/approval-badge";
import { CreditBar } from "@/components/credit-bar";
import { KpiCard } from "@/components/kpi-card";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PAYMENT_METHOD_LABELS,
  type ApprovalStatus,
  type PaymentMethod,
} from "@/lib/constants";
import { fmtDate, getStatus, today as todayStr } from "@/lib/format";
import { auth } from "@/server/auth";
import { exportColumnMeta } from "@/server/export/datasets";
import { api } from "@/trpc/server";
import { BillsExportButton } from "@/features/bills/components/bills-export-button";

export default async function DashboardPage() {
  const today = todayStr();

  const [
    session,
    customerStats,
    billStats,
    pendingApprovals,
    topOutstanding,
    allPayments,
    customers,
  ] = await Promise.all([
    auth(),
    api.customers.stats(),
    api.bills.stats({ today }),
    api.payments.pendingCount(),
    api.customers.topOutstanding({ limit: 5 }),
    api.payments.list(),
    api.customers.list(),
  ]);

  const isAdmin = session?.user?.role === "admin";

  const pendingPayments = allPayments
    .filter((p) => p.approval === "pending")
    .slice(0, 5);
  const recentPayments = allPayments
    .filter((p) => p.approval === "approved")
    .slice(0, 5);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back, {session?.user?.name ?? session?.user?.email}.
          </p>
        </div>
        {isAdmin ? (
          <BillsExportButton
            columns={exportColumnMeta.bills}
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
            label="Export bills"
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total outstanding"
          value={<Money paisas={customerStats.totalOutstandingPaisas} />}
          sub={`Across ${customerStats.activeCount} active ${customerStats.activeCount === 1 ? "customer" : "customers"}`}
          href="/customers"
          Icon={TrendingUp}
        />
        <KpiCard
          label="Pending approvals"
          value={pendingApprovals}
          sub={
            pendingApprovals > 0
              ? "Awaiting admin review"
              : "All payments finalized"
          }
          tone={pendingApprovals > 0 ? "text-amber-700" : undefined}
          href="/payments"
          Icon={ClipboardCheck}
        />
        <KpiCard
          label="Today's bills"
          value={billStats.todayCount}
          sub={
            <>
              <Money paisas={billStats.todayTotalPaisas} /> total
            </>
          }
          href="/customers"
          Icon={Receipt}
        />
        <KpiCard
          label="Over-limit customers"
          value={customerStats.overlimitCount}
          sub={`of ${customerStats.totalCount} total`}
          tone={
            customerStats.overlimitCount > 0 ? "text-destructive" : undefined
          }
          href="/customers"
          Icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Top Outstanding</CardTitle>
            <Link
              href="/customers"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              View All
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {topOutstanding.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No customers carrying outstanding balances.
              </p>
            ) : (
              topOutstanding.map((c) => {
                const status = getStatus(
                  c.outstandingPaisas,
                  c.creditLimitPaisas,
                );
                return (
                  <Link
                    key={c.id}
                    href={`/customers/${c.id}`}
                    className="hover:bg-muted/40 -mx-2 rounded-md px-2 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {c.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {c.area ?? "—"}
                        </div>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <CreditBar
                      outstandingPaisas={c.outstandingPaisas}
                      creditLimitPaisas={c.creditLimitPaisas}
                      className="mt-1.5"
                    />
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pending Approvals</CardTitle>
            <Link
              href="/payments"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Go to ledger
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pendingPayments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No pending payments. Nice and clean.
              </p>
            ) : (
              pendingPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50/40 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {p.customerName}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      <span>{p.payId}</span>
                      <span>·</span>
                      <span>{fmtDate(p.date)}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ??
                          p.method}
                      </Badge>
                    </div>
                  </div>
                  <Money
                    paisas={p.amountPaisas}
                    className="text-sm font-bold"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            <span className="flex items-center gap-2">
              <Banknote className="size-4" />
              Recent approved payments
            </span>
          </CardTitle>
          <Link
            href="/payments"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Full ledger
          </Link>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No approved payments yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {p.customerName}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                      <span>{p.payId}</span>
                      <span>·</span>
                      <span>{fmtDate(p.date)}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ??
                          p.method}
                      </Badge>
                      <ApprovalBadge approval={p.approval as ApprovalStatus} />
                    </div>
                  </div>
                  <Money
                    paisas={p.amountPaisas}
                    className="text-sm font-bold text-emerald-700"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
