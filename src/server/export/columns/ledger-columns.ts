import { LEDGER_KIND_LABELS, type LedgerEntry } from "@/features/ledger/ledger";
import { paisasToRupees } from "@/lib/format";
import type { ColumnDef } from "../types";

export const ledgerColumns: ColumnDef<LedgerEntry>[] = [
  { key: "date", header: "Date", type: "date", accessor: (e) => e.date },
  {
    key: "kind",
    header: "Type",
    type: "string",
    accessor: (e) => LEDGER_KIND_LABELS[e.kind],
  },
  { key: "ref", header: "Reference", type: "string", accessor: (e) => e.ref },
  {
    key: "note",
    header: "Note",
    type: "string",
    accessor: (e) => e.note,
    default: false,
  },
  {
    key: "debit",
    header: "Debit (Rs)",
    type: "currency",
    accessor: (e) =>
      e.effect === "debit" ? paisasToRupees(e.amountPaisas) : null,
  },
  {
    key: "credit",
    header: "Credit (Rs)",
    type: "currency",
    accessor: (e) =>
      e.effect === "credit" ? paisasToRupees(e.amountPaisas) : null,
  },
  {
    key: "balance",
    header: "Balance (Rs)",
    // Not "currency" — the xlsx/pdf formatters auto-sum every currency column,
    // and summing a running balance is meaningless.
    type: "number",
    accessor: (e) => paisasToRupees(e.balancePaisas),
  },
];
