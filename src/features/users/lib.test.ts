import { describe, expect, it } from "vitest";
import type { User } from "@/server/db/schema";
import { filterUsers } from "./lib";

function usr(over: Partial<User>): User {
  return {
    id: "1",
    name: "User",
    email: "user@example.test",
    emailVerified: null,
    image: null,
    passwordHash: "hash",
    role: "user",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...over,
  } as User;
}

const rows = [
  usr({ id: "1", name: "Ahmed", email: "ahmed@meguin.test", role: "admin" }),
  usr({
    id: "2",
    name: "Salman",
    email: "salman@meguin.test",
    role: "user",
    isActive: true,
  }),
  usr({
    id: "3",
    name: "Zara",
    email: "zara@meguin.test",
    role: "user",
    isActive: false,
  }),
];

describe("filterUsers", () => {
  it("returns all rows with no filters", () => {
    expect(filterUsers(rows, {})).toHaveLength(3);
  });

  it("filters by role", () => {
    expect(filterUsers(rows, { role: "admin" }).map((u) => u.id)).toEqual([
      "1",
    ]);
  });

  it("filters by status (active/inactive)", () => {
    expect(filterUsers(rows, { status: "active" }).map((u) => u.id)).toEqual([
      "1",
      "2",
    ]);
    expect(filterUsers(rows, { status: "inactive" }).map((u) => u.id)).toEqual([
      "3",
    ]);
  });

  it("searches name and email case-insensitively", () => {
    expect(filterUsers(rows, { search: "salman" }).map((u) => u.id)).toEqual([
      "2",
    ]);
    expect(
      filterUsers(rows, { search: "ZARA@MEGUIN" }).map((u) => u.id),
    ).toEqual(["3"]);
  });

  it("treats 'all' and empty values as no constraint", () => {
    expect(
      filterUsers(rows, { role: "all", status: "all", search: "" }),
    ).toHaveLength(3);
  });

  it("combines filters (AND)", () => {
    expect(
      filterUsers(rows, { role: "user", status: "inactive" }).map((u) => u.id),
    ).toEqual(["3"]);
  });

  it("empty search is a no-op", () => {
    expect(filterUsers(rows, { search: "   " })).toHaveLength(3);
  });
});
