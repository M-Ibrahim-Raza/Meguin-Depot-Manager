import {
  STOCK_LOCATION_LABELS,
  STOCK_MOVEMENT_KIND_LABELS,
  type StockLocation,
} from "@/lib/constants";
import type { StockMovementListRow } from "@/server/db/repos/stock.repo";
import type { StockMovementKind } from "@/server/db/schema";
import type { ColumnDef } from "../types";

/** Format a stored timestamp as a plain YYYY-MM-DD string for machine formats. */
function ymd(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export const stockMovementColumns: ColumnDef<StockMovementListRow>[] = [
  {
    key: "createdAt",
    header: "Date",
    type: "date",
    accessor: (r) => ymd(r.createdAt),
  },
  {
    key: "articleNumber",
    header: "Article Number",
    type: "string",
    accessor: (r) => r.articleNumber,
  },
  { key: "name", header: "Product", type: "string", accessor: (r) => r.name },
  {
    key: "kind",
    header: "Kind",
    type: "string",
    accessor: (r) =>
      STOCK_MOVEMENT_KIND_LABELS[r.kind as StockMovementKind] ?? r.kind,
  },
  {
    key: "location",
    header: "Location",
    type: "string",
    accessor: (r) =>
      STOCK_LOCATION_LABELS[r.location as StockLocation] ?? r.location,
  },
  {
    key: "qtyDelta",
    header: "Change",
    type: "number",
    accessor: (r) => Number(r.qtyDelta),
  },
  {
    key: "balanceAfter",
    header: "Balance After",
    type: "number",
    accessor: (r) => Number(r.balanceAfter),
  },
  {
    key: "billNo",
    header: "Bill",
    type: "string",
    accessor: (r) => r.billNo,
    default: false,
  },
  {
    key: "note",
    header: "Note",
    type: "string",
    accessor: (r) => r.note,
    default: false,
  },
  {
    key: "createdByName",
    header: "By",
    type: "string",
    accessor: (r) => r.createdByName,
    default: false,
  },
];
