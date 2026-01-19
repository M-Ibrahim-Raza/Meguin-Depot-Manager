/**
 * Core contracts for the export engine.
 *
 * The engine is split into three decoupled stages so adding a dataset or a
 * format is a localized change (DRY):
 *   1. A per-dataset column registry (`ColumnDef[]`) projects domain rows into
 *      flat cell values via `accessor` — the ONLY place that knows row shapes.
 *   2. `buildTable` turns rows + columns into a format-agnostic `ExportTable`.
 *   3. A `Formatter` turns an `ExportTable` into bytes. Formatters never touch
 *      domain types, so each one works for every dataset.
 */

export type CellType = "string" | "number" | "currency" | "date";

/** A scalar cell. `currency` cells carry a number in rupees so formats can sum them. */
export type CellValue = string | number | null;

export type ColumnDef<T> = {
  key: string;
  header: string;
  type: CellType;
  accessor: (row: T) => CellValue;
  /** Whether the column is selected by default in the export dialog (default true). */
  default?: boolean;
};

export const EXPORT_FORMATS = ["json", "csv", "xlsx", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export type ExportMeta = {
  title: string;
  generatedAt: Date;
  /** Human-readable lines describing the applied filters (shown in the PDF). */
  filterSummary: string[];
};

export type FormatResult = {
  body: Buffer | string;
  contentType: string;
  ext: string;
};

export type TableColumn = { key: string; header: string; type: CellType };
export type ExportTable = { columns: TableColumn[]; rows: CellValue[][] };

export type Formatter = (
  table: ExportTable,
  meta: ExportMeta,
) => FormatResult | Promise<FormatResult>;

/** Serializable column descriptor handed to the client dialog for column toggles. */
export type ExportColumnMeta = { key: string; label: string; default: boolean };

/** Project domain rows through the selected columns into a format-agnostic table. */
export function buildTable<T>(rows: T[], columns: ColumnDef<T>[]): ExportTable {
  return {
    columns: columns.map((c) => ({
      key: c.key,
      header: c.header,
      type: c.type,
    })),
    rows: rows.map((row) => columns.map((c) => c.accessor(row))),
  };
}

/** Keep only the requested columns (preserving registry order). `null` → all. */
export function selectColumns<T>(
  all: ColumnDef<T>[],
  keys: string[] | null,
): ColumnDef<T>[] {
  if (!keys || keys.length === 0) return all;
  const wanted = new Set(keys);
  const picked = all.filter((c) => wanted.has(c.key));
  return picked.length > 0 ? picked : all;
}

/** Derive the client-facing column toggle metadata from a server registry. */
export function toColumnMeta<T>(columns: ColumnDef<T>[]): ExportColumnMeta[] {
  return columns.map((c) => ({
    key: c.key,
    label: c.header,
    default: c.default !== false,
  }));
}
