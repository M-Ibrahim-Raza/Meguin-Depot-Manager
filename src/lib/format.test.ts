import { describe, expect, it } from "vitest";
import {
  fmtPaisas,
  fmtRupeesGrouped,
  getStatus,
  lineTotalPaisas,
  nextTransferNo,
  parseAmountInput,
  pct,
  rupeesToPaisas,
} from "./format";

describe("fmtPaisas", () => {
  it("formats integer paisas as Rs. rupees with PK grouping", () => {
    expect(fmtPaisas(12_500_000n)).toBe("Rs. 1,25,000");
  });

  it("returns Rs. 0 for null / undefined", () => {
    expect(fmtPaisas(null)).toBe("Rs. 0");
    expect(fmtPaisas(undefined)).toBe("Rs. 0");
  });

  it("clamps negative paisas to 0", () => {
    expect(fmtPaisas(-500)).toBe("Rs. 0");
  });

  it("rounds to nearest rupee", () => {
    expect(fmtPaisas(149n)).toBe("Rs. 1");
    expect(fmtPaisas(150n)).toBe("Rs. 2");
  });
});

describe("lineTotalPaisas", () => {
  it("multiplies a whole qty by the unit price in paisas", () => {
    expect(lineTotalPaisas(2, 12_500n)).toBe(25_000n);
    expect(lineTotalPaisas(1, 0n)).toBe(0n);
  });
  it("supports fractional quantities (e.g. litres) and rounds to paisas", () => {
    expect(lineTotalPaisas(2.5, 10_000n)).toBe(25_000n);
    expect(lineTotalPaisas(0.333, 100n)).toBe(33n);
  });
});

describe("rupeesToPaisas", () => {
  it("multiplies by 100 and rounds", () => {
    expect(rupeesToPaisas(125_000)).toBe(12_500_000n);
    expect(rupeesToPaisas(0.5)).toBe(50n);
  });
});

describe("pct", () => {
  it("returns 100 when limit is 0 and there is outstanding balance", () => {
    expect(pct(100, 0)).toBe(100);
  });
  it("returns 0 when limit is 0 and there is no outstanding balance", () => {
    expect(pct(0, 0)).toBe(0);
  });
  it("caps at 100", () => {
    expect(pct(500, 200)).toBe(100);
  });
  it("rounds", () => {
    expect(pct(33, 100)).toBe(33);
    expect(pct(85, 100)).toBe(85);
  });
});

describe("getStatus", () => {
  it("clear when outstanding is zero or negative", () => {
    expect(getStatus(0, 100_000)).toBe("clear");
    expect(getStatus(-1, 100_000)).toBe("clear");
  });
  it("overlimit at 100% or above", () => {
    expect(getStatus(100_000, 100_000)).toBe("overlimit");
    expect(getStatus(110_000, 100_000)).toBe("overlimit");
  });
  it("warning between 85% and 100%", () => {
    expect(getStatus(85_000, 100_000)).toBe("warning");
    expect(getStatus(99_000, 100_000)).toBe("warning");
  });
  it("active below 85%", () => {
    expect(getStatus(50_000, 100_000)).toBe("active");
    expect(getStatus(84_000, 100_000)).toBe("active");
  });
  it("works with bigint paisas", () => {
    expect(getStatus(50_000_00n, 100_000_00n)).toBe("active");
    expect(getStatus(120_000_00n, 100_000_00n)).toBe("overlimit");
  });
});

describe("nextTransferNo", () => {
  it("starts at T-1 when there are no transfers", () => {
    expect(nextTransferNo([])).toBe("T-1");
  });

  it("returns one past the current max, ignoring unparseable slips", () => {
    expect(
      nextTransferNo([{ slipNo: "T-3" }, { slipNo: "T-7" }, { slipNo: "T-x" }]),
    ).toBe("T-8");
  });
});

describe("parseAmountInput", () => {
  it("strips commas and returns the number", () => {
    expect(parseAmountInput("1,00,000")).toBe(100_000);
    expect(parseAmountInput("10,00,00,000")).toBe(100_000_000);
  });
  it("strips currency prefixes and stray characters", () => {
    expect(parseAmountInput("Rs. 1,25,000")).toBe(125_000);
    expect(parseAmountInput("1.250")).toBe(1250);
    expect(parseAmountInput("-50,000")).toBe(50_000);
  });
  it("returns 0 for empty or non-digit input", () => {
    expect(parseAmountInput("")).toBe(0);
    expect(parseAmountInput("abc")).toBe(0);
  });
  it("drops leading zeros via Number coercion", () => {
    expect(parseAmountInput("00100")).toBe(100);
  });
});

describe("fmtRupeesGrouped", () => {
  it("groups using PK / Indian conventions", () => {
    expect(fmtRupeesGrouped(100_000)).toBe("1,00,000");
    expect(fmtRupeesGrouped(2_500_000)).toBe("25,00,000");
    expect(fmtRupeesGrouped(100_000_000)).toBe("10,00,00,000");
  });
  it("renders small numbers without commas", () => {
    expect(fmtRupeesGrouped(0)).toBe("0");
    expect(fmtRupeesGrouped(999)).toBe("999");
  });
});
