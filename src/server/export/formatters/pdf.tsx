import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { BUSINESS_INFO } from "@/lib/constants";
import { fmtDate, fmtRupeesGrouped } from "@/lib/format";
import type {
  CellType,
  CellValue,
  ExportMeta,
  ExportTable,
  FormatResult,
} from "../types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  business: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 11, marginTop: 2 },
  meta: { fontSize: 8, color: "#6b7280", marginTop: 2 },
  table: { marginTop: 12 },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderColor: "#9ca3af",
  },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#e5e7eb" },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1.5,
    borderColor: "#9ca3af",
  },
  cell: { flex: 1, paddingVertical: 3, paddingHorizontal: 4 },
  cellRight: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
    textAlign: "right",
  },
  headerCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
  },
  headerCellRight: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  empty: { marginTop: 32, textAlign: "center", color: "#6b7280", fontSize: 10 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    textAlign: "right",
    fontSize: 7,
    color: "#9ca3af",
  },
});

function fmtCell(value: CellValue, type: CellType): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "currency") return fmtRupeesGrouped(Number(value));
  if (type === "date") return fmtDate(String(value));
  return String(value);
}

export async function toPdf(
  table: ExportTable,
  meta: ExportMeta,
): Promise<FormatResult> {
  const currencyTotals = table.columns.map((col, i) =>
    col.type === "currency"
      ? table.rows.reduce(
          (sum, row) =>
            sum + (typeof row[i] === "number" ? (row[i] as number) : 0),
          0,
        )
      : null,
  );
  const hasCurrency = table.columns.some((c) => c.type === "currency");

  const doc = (
    <Document title={meta.title}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View>
          <Text style={styles.business}>{BUSINESS_INFO.name}</Text>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.meta}>Generated {fmtDate(meta.generatedAt)}</Text>
          {meta.filterSummary.length > 0 ? (
            <Text style={styles.meta}>
              {meta.filterSummary.join("    ·    ")}
            </Text>
          ) : null}
        </View>

        {table.rows.length === 0 ? (
          <Text style={styles.empty}>
            No records match the selected filters.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.headerRow} fixed>
              {table.columns.map((col) => (
                <Text
                  key={col.key}
                  style={
                    col.type === "currency"
                      ? styles.headerCellRight
                      : styles.headerCell
                  }
                >
                  {col.header}
                </Text>
              ))}
            </View>

            {table.rows.map((row, ri) => (
              <View key={ri} style={styles.row} wrap={false}>
                {table.columns.map((col, ci) => (
                  <Text
                    key={col.key}
                    style={
                      col.type === "currency" ? styles.cellRight : styles.cell
                    }
                  >
                    {fmtCell(row[ci], col.type)}
                  </Text>
                ))}
              </View>
            ))}

            {hasCurrency ? (
              <View style={styles.totalRow} wrap={false}>
                {table.columns.map((col, ci) => (
                  <Text
                    key={col.key}
                    style={
                      col.type === "currency"
                        ? styles.headerCellRight
                        : styles.headerCell
                    }
                  >
                    {col.type === "currency"
                      ? fmtRupeesGrouped(currencyTotals[ci] as number)
                      : ci === 0
                        ? "TOTAL"
                        : ""}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );

  const body = await renderToBuffer(doc);
  return { body, contentType: "application/pdf", ext: "pdf" };
}
