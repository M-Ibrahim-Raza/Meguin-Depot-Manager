import { STOCK_STATUS_LABEL, stockStatus } from "@/features/stock/lib";
import type { StockListRow } from "@/server/db/repos/stock.repo";
import type { ColumnDef } from "../types";

/** Format a stored timestamp as a plain YYYY-MM-DD string for machine formats. */
function ymd(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export const stockColumns: ColumnDef<StockListRow>[] = [
  {
    key: "articleNumber",
    header: "Article Number",
    type: "string",
    accessor: (r) => r.articleNumber,
  },
  { key: "name", header: "Name", type: "string", accessor: (r) => r.name },
  {
    key: "category",
    header: "Category",
    type: "string",
    accessor: (r) => r.category,
  },
  { key: "unit", header: "Unit", type: "string", accessor: (r) => r.unit },
  {
    key: "warehouseQty",
    header: "Warehouse Qty",
    type: "number",
    accessor: (r) => r.warehouseQty,
  },
  {
    key: "officeQty",
    header: "Office Qty",
    type: "number",
    accessor: (r) => r.officeQty,
  },
  {
    key: "quantityOnHand",
    header: "Total Qty",
    type: "number",
    accessor: (r) => r.quantityOnHand,
  },
  {
    key: "reorderLevel",
    header: "Reorder Level",
    type: "number",
    accessor: (r) => r.reorderLevel,
    default: false,
  },
  {
    key: "status",
    header: "Status",
    type: "string",
    accessor: (r) =>
      STOCK_STATUS_LABEL[stockStatus(r.quantityOnHand, r.reorderLevel)],
  },
  {
    key: "updatedAt",
    header: "Last Updated",
    type: "date",
    accessor: (r) => ymd(r.updatedAt),
    default: false,
  },
];
