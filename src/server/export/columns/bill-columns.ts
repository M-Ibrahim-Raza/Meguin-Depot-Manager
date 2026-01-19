import { BILL_STATUS_LABELS, type BillStatus } from "@/lib/constants";
import { paisasToRupees } from "@/lib/format";
import type { BillWithCustomer } from "@/server/db/repos/bills.repo";
import type { ColumnDef } from "../types";

function ymd(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export const billColumns: ColumnDef<BillWithCustomer>[] = [
  {
    key: "billNo",
    header: "Bill No",
    type: "string",
    accessor: (b) => b.billNo,
  },
  {
    key: "customerName",
    header: "Customer",
    type: "string",
    accessor: (b) => b.customerName,
  },
  { key: "date", header: "Date", type: "date", accessor: (b) => b.date },
  {
    key: "direction",
    header: "Direction",
    type: "string",
    accessor: (b) => (b.direction === "return" ? "Return" : "Sale"),
  },
  { key: "type", header: "Type", type: "string", accessor: (b) => b.type },
  {
    key: "status",
    header: "Status",
    type: "string",
    accessor: (b) => BILL_STATUS_LABELS[b.status as BillStatus] ?? b.status,
  },
  {
    key: "amount",
    header: "Amount (Rs)",
    type: "currency",
    accessor: (b) => paisasToRupees(b.amountPaisas),
  },
  {
    key: "approvedBy",
    header: "Approved By",
    type: "string",
    accessor: (b) => b.approvedBy,
  },
  {
    key: "note",
    header: "Note",
    type: "string",
    accessor: (b) => b.note,
    default: false,
  },
  {
    key: "createdAt",
    header: "Created At",
    type: "date",
    accessor: (b) => ymd(b.createdAt),
    default: false,
  },
];
