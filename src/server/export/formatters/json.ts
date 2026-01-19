import type { ExportTable, FormatResult } from "../types";

/** Array of objects keyed by column key — the machine-friendly shape. */
export function toJson(table: ExportTable): FormatResult {
  const objects = table.rows.map((row) =>
    Object.fromEntries(table.columns.map((col, i) => [col.key, row[i]])),
  );
  return {
    body: JSON.stringify(objects, null, 2),
    contentType: "application/json; charset=utf-8",
    ext: "json",
  };
}
