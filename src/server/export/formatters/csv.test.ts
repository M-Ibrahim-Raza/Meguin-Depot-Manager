import { describe, expect, it } from "vitest";
import type { ExportTable } from "../types";
import { escapeCsvCell, toCsv } from "./csv";

describe("escapeCsvCell", () => {
  it("renders null/undefined as an empty field", () => {
    expect(escapeCsvCell(null)).toBe("");
  });

  it("passes plain strings and numbers through unquoted", () => {
    expect(escapeCsvCell("hello")).toBe("hello");
    expect(escapeCsvCell(42)).toBe("42");
    expect(escapeCsvCell(0)).toBe("0");
  });

  it("quotes fields containing a comma", () => {
    expect(escapeCsvCell("Ali, Traders")).toBe('"Ali, Traders"');
  });

  it("escapes embedded quotes by doubling them", () => {
    expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("quotes fields containing CR or LF", () => {
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
    expect(escapeCsvCell("a\r\nb")).toBe('"a\r\nb"');
  });
});

describe("toCsv", () => {
  const table: ExportTable = {
    columns: [
      { key: "name", header: "Name", type: "string" },
      { key: "amount", header: "Amount", type: "currency" },
    ],
    rows: [
      ["Ali, Traders", 12500],
      ['He said "hi"', 0],
    ],
  };

  it("prepends a UTF-8 BOM so Excel reads it correctly", () => {
    const { body } = toCsv(table);
    expect((body as string).charCodeAt(0)).toBe(0xfeff);
  });

  it("emits a header row, CRLF line endings, and escaped cells", () => {
    const text = (toCsv(table).body as string).slice(1); // drop BOM
    expect(text).toBe(
      ["Name,Amount", '"Ali, Traders",12500', '"He said ""hi""",0'].join(
        "\r\n",
      ),
    );
  });

  it("reports the csv content type and extension", () => {
    const result = toCsv(table);
    expect(result.ext).toBe("csv");
    expect(result.contentType).toContain("text/csv");
  });
});
