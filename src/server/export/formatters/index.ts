import type { ExportFormat, Formatter } from "../types";
import { toCsv } from "./csv";
import { toJson } from "./json";
import { toPdf } from "./pdf";
import { toXlsx } from "./xlsx";

export const formatters: Record<ExportFormat, Formatter> = {
  json: toJson,
  csv: toCsv,
  xlsx: toXlsx,
  pdf: toPdf,
};
