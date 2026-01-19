import {
  APPROVAL_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type ApprovalStatus,
  type PaymentMethod,
} from "@/lib/constants";
import { paisasToRupees } from "@/lib/format";
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";
import type { ColumnDef } from "../types";

/** Format a stored timestamp as a plain YYYY-MM-DD string for machine formats. */
function ymd(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export const paymentColumns: ColumnDef<PaymentWithCustomer>[] = [
  {
    key: "payId",
    header: "Payment ID",
    type: "string",
    accessor: (p) => p.payId,
  },
  { key: "date", header: "Date", type: "date", accessor: (p) => p.date },
  {
    key: "customerName",
    header: "Customer",
    type: "string",
    accessor: (p) => p.customerName,
  },
  {
    key: "customerArea",
    header: "Area",
    type: "string",
    accessor: (p) => p.customerArea,
    default: false,
  },
  {
    key: "amount",
    header: "Amount (Rs)",
    type: "currency",
    accessor: (p) => paisasToRupees(p.amountPaisas),
  },
  {
    key: "method",
    header: "Method",
    type: "string",
    accessor: (p) =>
      PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method,
  },
  {
    key: "approval",
    header: "Approval",
    type: "string",
    accessor: (p) =>
      APPROVAL_STATUS_LABELS[p.approval as ApprovalStatus] ?? p.approval,
  },
  {
    key: "approvedBy",
    header: "Approved By",
    type: "string",
    accessor: (p) => p.approvedBy,
  },
  {
    key: "note",
    header: "Note",
    type: "string",
    accessor: (p) => p.note,
    default: false,
  },
  {
    key: "createdAt",
    header: "Recorded At",
    type: "date",
    accessor: (p) => ymd(p.createdAt),
    default: false,
  },
];
