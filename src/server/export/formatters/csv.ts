import type { CellValue, ExportTable, FormatResult } from "../types";

/**
 * RFC-4180 escaping: wrap a field in double quotes when it contains a comma,
 * quote, CR or LF, doubling any embedded quotes.
 */
export function escapeCsvCell(value: CellValue): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(table: ExportTable): FormatResult {
  const lines = [
    table.columns.map((c) => escapeCsvCell(c.header)).join(","),
    ...table.rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  // Lead with a UTF-8 BOM so Excel opens non-ASCII text correctly.
  return {
    body: "﻿" + lines.join("\r\n"),
    contentType: "text/csv; charset=utf-8",
    ext: "csv",
  };
}
