import { describe, expect, it } from "vitest";
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";
import type {
  StockListRow,
  StockMovementListRow,
} from "@/server/db/repos/stock.repo";
import type { Customer } from "@/server/db/schema";
import { customerColumns } from "./columns/customer-columns";
import { paymentColumns } from "./columns/payment-columns";
import { stockColumns } from "./columns/stock-columns";
import { stockMovementColumns } from "./columns/stock-movement-columns";
import { buildTable, selectColumns, toColumnMeta } from "./types";

const payment = {
  id: 1,
  payId: "P-001",
  customerId: 1,
  date: "2026-06-01",
  amountPaisas: 12_500n,
  method: "cash",
  note: null,
  approval: "approved",
  approvedBy: "Owner",
  approvedAt: null,
  rejectReason: null,
  createdBy: null,
  createdAt: new Date("2026-06-01"),
  customerName: "Ali Traders",
  customerArea: "North",
} as PaymentWithCustomer;

const customer = {
  id: 1,
  name: "Ali Traders",
  area: "North",
  phone: "0300",
  referral: null,
  creditLimitPaisas: 200_000n,
  outstandingPaisas: 50_000n,
  paymentType: "deferred",
  lastPaymentDate: "2026-05-30",
  lastPaymentPaisas: 10_000n,
  createdAt: new Date("2026-01-01"),
} as Customer;

describe("column accessors", () => {
  it("converts currency columns from paisas to rupees (number, not bigint)", () => {
    const amount = paymentColumns.find((c) => c.key === "amount")!;
    expect(amount.type).toBe("currency");
    expect(amount.accessor(payment)).toBe(125);

    const outstanding = customerColumns.find((c) => c.key === "outstanding")!;
    expect(outstanding.accessor(customer)).toBe(500);
  });

  it("maps enum codes to human labels", () => {
    const method = paymentColumns.find((c) => c.key === "method")!;
    expect(method.accessor(payment)).toBe("Cash");
    const status = customerColumns.find((c) => c.key === "status")!;
    expect(status.accessor(customer)).toBe("Active");
  });
});

const stockRow: StockListRow = {
  articleNumber: "A-1",
  name: "Engine Oil 20W-50",
  unit: "L",
  category: "Engine Oil",
  active: true,
  warehouseQty: 2,
  officeQty: 0,
  quantityOnHand: 2,
  reorderLevel: 5,
  updatedAt: new Date("2026-06-15T00:00:00.000Z"),
};

const movementRow: StockMovementListRow = {
  id: 1,
  articleNumber: "A-1",
  name: "Engine Oil 20W-50",
  kind: "sale",
  location: "warehouse",
  qtyDelta: "-3.000",
  balanceAfter: "2.000",
  billId: 10,
  transferId: null,
  note: null,
  createdBy: "u1",
  createdAt: new Date("2026-06-15T00:00:00.000Z"),
  billNo: "B-010",
  billCustomerId: 1,
  createdByName: "Owner",
};

describe("stock column accessors", () => {
  it("has no currency columns (stock carries no money)", () => {
    expect(stockColumns.some((c) => c.type === "currency")).toBe(false);
    expect(stockMovementColumns.some((c) => c.type === "currency")).toBe(false);
  });

  it("derives the Out/Low/OK status label from qty + reorder level", () => {
    const status = stockColumns.find((c) => c.key === "status")!;
    expect(status.accessor(stockRow)).toBe("Low");
  });

  it("formats updatedAt as a plain YYYY-MM-DD string", () => {
    const updatedAt = stockColumns.find((c) => c.key === "updatedAt")!;
    expect(updatedAt.accessor(stockRow)).toBe("2026-06-15");
  });

  it("maps movement kind and location codes to human labels", () => {
    const kind = stockMovementColumns.find((c) => c.key === "kind")!;
    expect(kind.accessor(movementRow)).toBe("Sale");
    const location = stockMovementColumns.find((c) => c.key === "location")!;
    expect(location.accessor(movementRow)).toBe("Warehouse");
  });

  it("converts qtyDelta/balanceAfter from numeric strings to numbers", () => {
    const qtyDelta = stockMovementColumns.find((c) => c.key === "qtyDelta")!;
    expect(qtyDelta.accessor(movementRow)).toBe(-3);
    const balanceAfter = stockMovementColumns.find(
      (c) => c.key === "balanceAfter",
    )!;
    expect(balanceAfter.accessor(movementRow)).toBe(2);
  });
});

describe("buildTable", () => {
  it("projects rows through accessors and leaks no bigint", () => {
    const table = buildTable([payment], paymentColumns);
    expect(table.columns.map((c) => c.key)).toEqual(
      paymentColumns.map((c) => c.key),
    );
    expect(table.rows).toHaveLength(1);
    for (const cell of table.rows[0]) {
      expect(typeof cell).not.toBe("bigint");
    }
  });
});

describe("selectColumns", () => {
  it("returns all columns for null or empty selection", () => {
    expect(selectColumns(paymentColumns, null)).toHaveLength(
      paymentColumns.length,
    );
    expect(selectColumns(paymentColumns, [])).toHaveLength(
      paymentColumns.length,
    );
  });

  it("keeps only requested columns in registry order", () => {
    const picked = selectColumns(paymentColumns, ["amount", "payId"]);
    expect(picked.map((c) => c.key)).toEqual(["payId", "amount"]);
  });

  it("falls back to all columns when no key matches", () => {
    expect(selectColumns(paymentColumns, ["nope"])).toHaveLength(
      paymentColumns.length,
    );
  });
});

describe("toColumnMeta", () => {
  it("exposes key/label and a default flag (default true)", () => {
    const meta = toColumnMeta(paymentColumns);
    const amount = meta.find((m) => m.key === "amount")!;
    expect(amount).toEqual({
      key: "amount",
      label: "Amount (Rs)",
      default: true,
    });
    const note = meta.find((m) => m.key === "note")!;
    expect(note.default).toBe(false);
  });
});
