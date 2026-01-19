import ExcelJS from "exceljs";
import type { ExportMeta, ExportTable, FormatResult } from "../types";

const CURRENCY_FMT = "#,##0";

/** Sum the numeric cells of a currency column. */
function columnTotal(table: ExportTable, colIndex: number): number {
  return table.rows.reduce((sum, row) => {
    const v = row[colIndex];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
}

export async function toXlsx(
  table: ExportTable,
  meta: ExportMeta,
): Promise<FormatResult> {
  const wb = new ExcelJS.Workbook();
  wb.created = meta.generatedAt;
  const ws = wb.addWorksheet(meta.title.slice(0, 31) || "Export");

  ws.columns = table.columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: Math.max(12, Math.min(42, col.header.length + 4)),
    style: col.type === "currency" ? { numFmt: CURRENCY_FMT } : undefined,
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of table.rows) {
    ws.addRow(
      Object.fromEntries(
        table.columns.map((col, i) => [col.key, row[i] ?? ""]),
      ),
    );
  }

  // Bold totals row summing every currency column.
  const currencyIndexes = table.columns
    .map((c, i) => (c.type === "currency" ? i : -1))
    .filter((i) => i >= 0);
  if (currencyIndexes.length > 0 && table.rows.length > 0) {
    const totals: Record<string, string | number> = {};
    if (table.columns[0].type !== "currency") {
      totals[table.columns[0].key] = "TOTAL";
    }
    for (const i of currencyIndexes) {
      totals[table.columns[i].key] = columnTotal(table, i);
    }
    ws.addRow(totals).font = { bold: true };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return {
    body: Buffer.from(buffer),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  };
}
