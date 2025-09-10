import { describe, expect, it } from "vitest";
import {
  filterTransfers,
  otherLocation,
  transferRouteLabel,
  validateTransferInput,
  type TransferFilterRow,
  type ValidateTransferArgs,
} from "./lib";

describe("otherLocation", () => {
  it("returns the opposite location", () => {
    expect(otherLocation("warehouse")).toBe("office");
    expect(otherLocation("office")).toBe("warehouse");
  });
});

describe("transferRouteLabel", () => {
  it("renders a human From → To route with labels", () => {
    expect(transferRouteLabel("warehouse", "office")).toBe(
      "Warehouse → Office",
    );
    expect(transferRouteLabel("office", "warehouse")).toBe(
      "Office → Warehouse",
    );
  });
});

describe("filterTransfers", () => {
  const rows: TransferFilterRow[] = [
    {
      slipNo: "T-1",
      fromLocation: "warehouse",
      toLocation: "office",
      note: "urgent restock",
      createdByName: "Salman",
    },
    {
      slipNo: "T-2",
      fromLocation: "office",
      toLocation: "warehouse",
      note: null,
      createdByName: "Ahmed",
    },
  ];

  it("returns all rows for an empty/whitespace query", () => {
    expect(filterTransfers(rows, "")).toHaveLength(2);
    expect(filterTransfers(rows, "   ")).toHaveLength(2);
  });

  it("matches the slip number case-insensitively", () => {
    expect(filterTransfers(rows, "t-2")).toEqual([rows[1]]);
  });

  it("matches the location label (warehouse/office)", () => {
    // T-1 goes warehouse→office, T-2 office→warehouse — both involve 'office'.
    expect(filterTransfers(rows, "office")).toHaveLength(2);
  });

  it("matches the note and the creator name", () => {
    expect(filterTransfers(rows, "urgent")).toEqual([rows[0]]);
    expect(filterTransfers(rows, "ahmed")).toEqual([rows[1]]);
  });
});

describe("validateTransferInput", () => {
  // Small factory: a valid warehouse→office transfer with one positive line.
  function makeArgs(
    overrides: Partial<ValidateTransferArgs> = {},
  ): ValidateTransferArgs {
    return {
      from: "warehouse",
      to: "office",
      lines: [{ articleNumber: "A-1", qty: 5 }],
      ...overrides,
    };
  }

  it("accepts a valid transfer", () => {
    expect(validateTransferInput(makeArgs())).toEqual({ ok: true });
  });

  it("rejects a transfer whose source equals its destination", () => {
    expect(
      validateTransferInput(makeArgs({ from: "office", to: "office" })),
    ).toEqual({ ok: false, error: "same-location" });
  });

  it("rejects a transfer with no lines", () => {
    expect(validateTransferInput(makeArgs({ lines: [] }))).toEqual({
      ok: false,
      error: "empty",
    });
  });

  it("rejects a transfer with a zero-quantity line", () => {
    expect(
      validateTransferInput(
        makeArgs({ lines: [{ articleNumber: "A-1", qty: 0 }] }),
      ),
    ).toEqual({ ok: false, error: "non-positive-qty" });
  });

  it("rejects a transfer with a negative-quantity line", () => {
    expect(
      validateTransferInput(
        makeArgs({ lines: [{ articleNumber: "A-1", qty: -3 }] }),
      ),
    ).toEqual({ ok: false, error: "non-positive-qty" });
  });

  it("rejects duplicate product lines", () => {
    expect(
      validateTransferInput(
        makeArgs({
          lines: [
            { articleNumber: "A-1", qty: 5 },
            { articleNumber: "A-1", qty: 2 },
          ],
        }),
      ),
    ).toEqual({ ok: false, error: "duplicate-line" });
  });
});
