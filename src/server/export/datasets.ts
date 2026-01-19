import {
  APPROVAL_STATUS_LABELS,
  BILL_STATUS_LABELS,
  CUSTOMER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  STOCK_LOCATION_LABELS,
  STOCK_MOVEMENT_KIND_LABELS,
} from "@/lib/constants";
import { resolveRange } from "@/lib/date-range";
import { billFilterSchema, filterBills } from "@/features/bills/lib";
import {
  customerFilterSchema,
  filterCustomers,
} from "@/features/customers/lib";
import {
  buildLedger,
  filterLedger,
  LEDGER_KIND_LABELS,
  ledgerFilterSchema,
  type LedgerKind,
} from "@/features/ledger/ledger";
import { paymentFilterSchema, filterPayments } from "@/features/payments/lib";
import {
  filterStockRows,
  stockFilterSchema,
  stockMovementFilterSchema,
} from "@/features/stock/lib";
import { listAllBills } from "@/server/db/repos/bills.repo";
import {
  getCustomer,
  getCustomerBills,
  getCustomerPayments,
  getCustomerReturnBills,
  listCustomers,
} from "@/server/db/repos/customers.repo";
import { listReversalsForCustomer } from "@/server/db/repos/payment-reversals.repo";
import { listAllPayments } from "@/server/db/repos/payments.repo";
import {
  listAllStockMovements,
  listStockWithProduct,
} from "@/server/db/repos/stock.repo";
import { billColumns } from "./columns/bill-columns";
import { customerColumns } from "./columns/customer-columns";
import { ledgerColumns } from "./columns/ledger-columns";
import { paymentColumns } from "./columns/payment-columns";
import { stockColumns } from "./columns/stock-columns";
import { stockMovementColumns } from "./columns/stock-movement-columns";
import {
  buildTable,
  selectColumns,
  toColumnMeta,
  type ExportColumnMeta,
  type ExportTable,
} from "./types";

export const RESOURCE_KEYS = [
  "customers",
  "payments",
  "bills",
  "ledger",
  "stock",
  "stock-movements",
] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export function isResourceKey(value: string): value is ResourceKey {
  return (RESOURCE_KEYS as readonly string[]).includes(value);
}

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  customers: "Customers",
  payments: "Payments",
  bills: "Bills",
  ledger: "Ledger",
  stock: "Stock",
  "stock-movements": "Stock Activity",
};

/** Column-toggle metadata handed to the client export dialog, per resource. */
export const exportColumnMeta: Record<ResourceKey, ExportColumnMeta[]> = {
  customers: toColumnMeta(customerColumns),
  payments: toColumnMeta(paymentColumns),
  bills: toColumnMeta(billColumns),
  ledger: toColumnMeta(ledgerColumns),
  stock: toColumnMeta(stockColumns),
  "stock-movements": toColumnMeta(stockMovementColumns),
};

export type BuiltExport = {
  table: ExportTable;
  title: string;
  filterSummary: string[];
};

function colsParam(searchParams: URLSearchParams): string[] | null {
  const raw = searchParams.get("cols");
  if (!raw) return null;
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  return keys.length ? keys : null;
}

function pushIf(
  out: string[],
  label: string,
  value: string | undefined,
  labels?: Record<string, string>,
) {
  if (!value || value === "all") return;
  out.push(`${label}: ${labels?.[value] ?? value}`);
}

function dateSummary(out: string[], from?: string, to?: string) {
  if (from || to) out.push(`Date: ${from || "…"} → ${to || "…"}`);
}

/**
 * Resolve a resource + query params into a format-agnostic table. Each branch
 * keeps its concrete row type, so column accessors stay type-checked while the
 * route handler downstream stays type-agnostic.
 */
export async function buildExportTable(
  resource: ResourceKey,
  searchParams: URLSearchParams,
): Promise<BuiltExport> {
  const cols = colsParam(searchParams);
  const raw = Object.fromEntries(searchParams.entries());

  if (resource === "customers") {
    const f = customerFilterSchema.parse(raw);
    const rows = filterCustomers(await listCustomers(), f);
    const summary: string[] = [];
    if (f.dateFrom || f.dateTo) {
      summary.push(`Added: ${f.dateFrom || "…"} → ${f.dateTo || "…"}`);
    }
    pushIf(summary, "Status", f.status, CUSTOMER_STATUS_LABELS);
    pushIf(summary, "Area", f.area);
    if (f.search) summary.push(`Search: "${f.search}"`);
    return {
      table: buildTable(rows, selectColumns(customerColumns, cols)),
      title: "Customers",
      filterSummary: summary,
    };
  }

  if (resource === "payments") {
    const f = paymentFilterSchema.parse(raw);
    const rows = filterPayments(await listAllPayments(), f);
    const summary: string[] = [];
    dateSummary(summary, f.dateFrom, f.dateTo);
    pushIf(summary, "Approval", f.approval, APPROVAL_STATUS_LABELS);
    pushIf(summary, "Method", f.method, PAYMENT_METHOD_LABELS);
    if (f.customerId && f.customerId !== "all") {
      summary.push(`Customer #${f.customerId}`);
    }
    if (f.search) summary.push(`Search: "${f.search}"`);
    return {
      table: buildTable(rows, selectColumns(paymentColumns, cols)),
      title: "Payments",
      filterSummary: summary,
    };
  }

  if (resource === "ledger") {
    const f = ledgerFilterSchema.parse(raw);
    const [bills, returnBills, payments, reversals, customer] =
      await Promise.all([
        getCustomerBills(f.customerId),
        getCustomerReturnBills(f.customerId),
        getCustomerPayments(f.customerId),
        listReversalsForCustomer(f.customerId),
        getCustomer(f.customerId),
      ]);
    const entries = filterLedger(
      buildLedger({ bills, returnBills, payments, reversals }),
      f,
    );
    const summary: string[] = [];
    dateSummary(summary, f.dateFrom, f.dateTo);
    if (f.kinds && f.kinds !== "all") {
      const kindsLabel =
        f.kinds === "none"
          ? "None"
          : f.kinds
              .split(",")
              .map((k) => LEDGER_KIND_LABELS[k as LedgerKind] ?? k)
              .join(", ");
      summary.push(`Kinds: ${kindsLabel}`);
    }
    return {
      table: buildTable(entries, selectColumns(ledgerColumns, cols)),
      title: customer ? `Ledger — ${customer.name}` : "Ledger",
      filterSummary: summary,
    };
  }

  if (resource === "stock") {
    const f = stockFilterSchema.parse(raw);
    const rows = filterStockRows(await listStockWithProduct(), {
      search: f.search ?? "",
      category: f.category ?? "All",
      lowOnly: f.lowOnly === "true",
    });
    const summary: string[] = [];
    pushIf(summary, "Category", f.category);
    if (f.lowOnly === "true") summary.push("Low stock only");
    if (f.search) summary.push(`Search: "${f.search}"`);
    return {
      table: buildTable(rows, selectColumns(stockColumns, cols)),
      title: "Stock",
      filterSummary: summary,
    };
  }

  if (resource === "stock-movements") {
    const f = stockMovementFilterSchema.parse(raw);
    const { from, to } = resolveRange(
      { range: "custom", from: f.dateFrom, to: f.dateTo },
      new Date(),
    );
    const rows = await listAllStockMovements({
      kind: f.kind,
      location: f.location,
      articleNumber: f.articleNumber,
      from,
      to,
    });
    const summary: string[] = [];
    dateSummary(summary, f.dateFrom, f.dateTo);
    pushIf(summary, "Kind", f.kind, STOCK_MOVEMENT_KIND_LABELS);
    pushIf(summary, "Location", f.location, STOCK_LOCATION_LABELS);
    if (f.articleNumber) summary.push(`Article: ${f.articleNumber}`);
    return {
      table: buildTable(rows, selectColumns(stockMovementColumns, cols)),
      title: "Stock Activity",
      filterSummary: summary,
    };
  }

  const f = billFilterSchema.parse(raw);
  const rows = filterBills(await listAllBills(), f);
  const summary: string[] = [];
  dateSummary(summary, f.dateFrom, f.dateTo);
  pushIf(summary, "Status", f.status, BILL_STATUS_LABELS);
  pushIf(summary, "Direction", f.direction, { sale: "Sale", return: "Return" });
  if (f.customerId && f.customerId !== "all") {
    summary.push(`Customer #${f.customerId}`);
  }
  if (f.search) summary.push(`Search: "${f.search}"`);
  return {
    table: buildTable(rows, selectColumns(billColumns, cols)),
    title: "Bills",
    filterSummary: summary,
  };
}
