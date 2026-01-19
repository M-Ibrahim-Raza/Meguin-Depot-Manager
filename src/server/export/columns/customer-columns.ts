import { CUSTOMER_STATUS_LABELS } from "@/lib/constants";
import { getStatus, paisasToRupees } from "@/lib/format";
import type { Customer } from "@/server/db/schema";
import type { ColumnDef } from "../types";

export const customerColumns: ColumnDef<Customer>[] = [
  { key: "name", header: "Name", type: "string", accessor: (c) => c.name },
  { key: "area", header: "Area", type: "string", accessor: (c) => c.area },
  { key: "phone", header: "Phone", type: "string", accessor: (c) => c.phone },
  {
    key: "paymentType",
    header: "Payment Type",
    type: "string",
    accessor: (c) => c.paymentType,
  },
  {
    key: "creditLimit",
    header: "Credit Limit (Rs)",
    type: "currency",
    accessor: (c) => paisasToRupees(c.creditLimitPaisas),
  },
  {
    key: "outstanding",
    header: "Outstanding (Rs)",
    type: "currency",
    accessor: (c) => paisasToRupees(c.outstandingPaisas),
  },
  {
    key: "status",
    header: "Status",
    type: "string",
    accessor: (c) =>
      CUSTOMER_STATUS_LABELS[
        getStatus(c.outstandingPaisas, c.creditLimitPaisas)
      ],
  },
  {
    key: "lastPaymentDate",
    header: "Last Payment",
    type: "date",
    accessor: (c) => c.lastPaymentDate,
  },
  {
    key: "referral",
    header: "Referral",
    type: "string",
    accessor: (c) => c.referral,
    default: false,
  },
  {
    key: "createdAt",
    header: "Date Added",
    type: "date",
    accessor: (c) =>
      c.createdAt ? c.createdAt.toISOString().slice(0, 10) : null,
    default: false,
  },
];
