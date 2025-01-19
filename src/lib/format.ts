export type CustomerStatus = "clear" | "active" | "warning" | "overlimit";

export function fmtPaisas(paisas: bigint | number | null | undefined): string {
  if (paisas === null || paisas === undefined) return "Rs. 0";
  const n = typeof paisas === "bigint" ? Number(paisas) : paisas;
  const rupees = Math.max(0, Math.round(n / 100));
  return "Rs. " + rupees.toLocaleString("en-IN");
}

export function fmtDate(date: string | Date | null | undefined): string {
  if (!date || date === "—") return "—";
  const dt = typeof date === "string" ? new Date(date) : date;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function pct(used: bigint | number, limit: bigint | number): number {
  const u = typeof used === "bigint" ? Number(used) : used;
  const l = typeof limit === "bigint" ? Number(limit) : limit;
  if (l <= 0) return u > 0 ? 100 : 0;
  return Math.min(100, Math.round((u / l) * 100));
}

export function getStatus(
  outstandingPaisas: bigint | number,
  creditLimitPaisas: bigint | number,
): CustomerStatus {
  const o =
    typeof outstandingPaisas === "bigint"
      ? Number(outstandingPaisas)
      : outstandingPaisas;
  const l =
    typeof creditLimitPaisas === "bigint"
      ? Number(creditLimitPaisas)
      : creditLimitPaisas;
  if (o <= 0) return "clear";
  const p = (o / l) * 100;
  if (p >= 100) return "overlimit";
  if (p >= 85) return "warning";
  return "active";
}

export function nextBillNo(
  existing: ReadonlyArray<{ billNo: string }>,
): string {
  const nums = existing
    .map((b) => parseInt(b.billNo.replace("B-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1045;
  return `B-${max + 1}`;
}

export function nextReturnBillNo(
  existing: ReadonlyArray<{ billNo: string }>,
): string {
  const nums = existing
    .map((b) => parseInt(b.billNo.replace("R-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `R-${max + 1}`;
}

export function nextTransferNo(
  existing: ReadonlyArray<{ slipNo: string }>,
): string {
  const nums = existing
    .map((t) => parseInt(t.slipNo.replace("T-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `T-${max + 1}`;
}

export function nextPaymentId(
  existing: ReadonlyArray<{ payId: string }>,
): string {
  const nums = existing
    .map((p) => parseInt(p.payId.replace("P-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 100;
  return `P-${String(max + 1).padStart(3, "0")}`;
}

export function nextReversalNo(
  existing: ReadonlyArray<{ reversalNo: string }>,
): string {
  const nums = existing
    .map((r) => parseInt(r.reversalNo.replace("RV-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `RV-${max + 1}`;
}

/** Multiply qty (number) × unitPricePaisas (bigint) safely, rounding to BigInt. */
export function lineTotalPaisas(qty: number, unitPricePaisas: bigint): bigint {
  return BigInt(Math.round(qty * Number(unitPricePaisas)));
}

export function rupeesToPaisas(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

export function paisasToRupees(paisas: bigint): number {
  return Math.round(Number(paisas) / 100);
}

export function parseAmountInput(s: string): number {
  const digits = s.replace(/[^\d]/g, "");
  return digits === "" ? 0 : Number(digits);
}

export function fmtRupeesGrouped(n: number): string {
  return n.toLocaleString("en-IN");
}
