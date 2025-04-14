import { describe, expect, it } from "vitest";
import type { Customer } from "@/server/db/schema";
import { filterCustomers } from "./lib";

function cust(over: Partial<Customer>): Customer {
  return {
    id: 1,
    name: "Customer",
    area: null,
    phone: null,
    referral: null,
    creditLimitPaisas: 100_000n,
    outstandingPaisas: 0n,
    paymentType: "deferred",
    lastPaymentDate: null,
    lastPaymentPaisas: null,
    createdAt: new Date("2026-01-01"),
    ...over,
  } as Customer;
}

const rows = [
  cust({
    id: 1,
    name: "Ali Traders",
    area: "North",
    phone: "0300",
    outstandingPaisas: 0n,
  }),
  cust({
    id: 2,
    name: "Noor & Co",
    area: "South",
    phone: "0311",
    outstandingPaisas: 50_000n,
  }),
  cust({
    id: 3,
    name: "Zee Mart",
    area: "North",
    phone: "0322",
    outstandingPaisas: 100_000n,
  }),
];

describe("filterCustomers", () => {
  it("returns all rows with no filters", () => {
    expect(filterCustomers(rows, {})).toHaveLength(3);
  });

  it("filters by area", () => {
    const r = filterCustomers(rows, { area: "North" });
    expect(r.map((c) => c.id)).toEqual([1, 3]);
  });

  it("searches name, phone, and area case-insensitively", () => {
    expect(filterCustomers(rows, { search: "noor" }).map((c) => c.id)).toEqual([
      2,
    ]);
    expect(filterCustomers(rows, { search: "0322" }).map((c) => c.id)).toEqual([
      3,
    ]);
    expect(filterCustomers(rows, { search: "SOUTH" }).map((c) => c.id)).toEqual(
      [2],
    );
  });

  it("filters by derived status (clear/active/overlimit)", () => {
    expect(filterCustomers(rows, { status: "clear" }).map((c) => c.id)).toEqual(
      [1],
    );
    expect(
      filterCustomers(rows, { status: "active" }).map((c) => c.id),
    ).toEqual([2]);
    expect(
      filterCustomers(rows, { status: "overlimit" }).map((c) => c.id),
    ).toEqual([3]);
  });

  it("treats 'all' and empty values as no constraint", () => {
    expect(
      filterCustomers(rows, { area: "all", status: "all", search: "" }),
    ).toHaveLength(3);
  });

  it("combines filters (AND)", () => {
    expect(
      filterCustomers(rows, { area: "North", status: "overlimit" }).map(
        (c) => c.id,
      ),
    ).toEqual([3]);
  });

  it("filters by registration date (createdAt), inclusive", () => {
    const dated = [
      cust({ id: 10, createdAt: new Date("2026-01-10T08:00:00Z") }),
      cust({ id: 20, createdAt: new Date("2026-03-15T08:00:00Z") }),
      cust({ id: 30, createdAt: new Date("2026-06-20T08:00:00Z") }),
    ];
    expect(
      filterCustomers(dated, {
        dateFrom: "2026-03-01",
        dateTo: "2026-06-30",
      }).map((c) => c.id),
    ).toEqual([20, 30]);
    // boundary day is kept
    expect(
      filterCustomers(dated, { dateTo: "2026-01-10" }).map((c) => c.id),
    ).toEqual([10]);
  });
});
