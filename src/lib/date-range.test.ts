import { describe, expect, it } from "vitest";
import {
  DEFAULT_DATE_RANGE_PRESET,
  resolveRange,
  ymdInZone,
  zonedEndOfDay,
  zonedStartOfDay,
} from "./date-range";

const TZ = "Asia/Karachi"; // UTC+5, no DST

const iso = (d?: Date) => d?.toISOString();

describe("zoned day boundaries (Asia/Karachi, UTC+5)", () => {
  it("start of day is local 00:00 = UTC 19:00 the previous day", () => {
    expect(iso(zonedStartOfDay("2026-06-21", TZ))).toBe(
      "2026-06-20T19:00:00.000Z",
    );
  });

  it("end of day is inclusive local 23:59:59.999", () => {
    expect(iso(zonedEndOfDay("2026-06-21", TZ))).toBe(
      "2026-06-21T18:59:59.999Z",
    );
  });

  it("defaults to APP_TIMEZONE when tz is omitted", () => {
    expect(iso(zonedStartOfDay("2026-06-21"))).toBe("2026-06-20T19:00:00.000Z");
  });
});

describe("ymdInZone — the near-midnight boundary", () => {
  it("an instant late in the UTC day is still the same Karachi day", () => {
    // 18:30 UTC → 23:30 PKT, same calendar day
    expect(ymdInZone(new Date("2026-06-21T18:30:00Z"), TZ)).toBe("2026-06-21");
  });

  it("an instant past 19:00 UTC has already rolled to the next Karachi day", () => {
    // 20:00 UTC → 01:00 PKT next day
    expect(ymdInZone(new Date("2026-06-21T20:00:00Z"), TZ)).toBe("2026-06-22");
  });
});

describe("resolveRange presets", () => {
  // 10:00 UTC → 15:00 PKT on 2026-06-21
  const now = new Date("2026-06-21T10:00:00Z");

  it("today = the full Karachi calendar day", () => {
    expect(resolveRange({ range: "today" }, now, TZ)).toEqual({
      from: new Date("2026-06-20T19:00:00.000Z"),
      to: new Date("2026-06-21T18:59:59.999Z"),
    });
  });

  it("last7 spans 7 inclusive days (today and the previous 6)", () => {
    const r = resolveRange({ range: "last7" }, now, TZ);
    expect(iso(r.from)).toBe("2026-06-14T19:00:00.000Z"); // start of 2026-06-15
    expect(iso(r.to)).toBe("2026-06-21T18:59:59.999Z");
  });

  it("last30 spans 30 inclusive days", () => {
    const r = resolveRange({ range: "last30" }, now, TZ);
    expect(iso(r.from)).toBe("2026-05-22T19:00:00.000Z"); // start of 2026-05-23
    expect(iso(r.to)).toBe("2026-06-21T18:59:59.999Z");
  });

  it("thisMonth runs from the 1st to today", () => {
    const r = resolveRange({ range: "thisMonth" }, now, TZ);
    expect(iso(r.from)).toBe("2026-05-31T19:00:00.000Z"); // start of 2026-06-01
    expect(iso(r.to)).toBe("2026-06-21T18:59:59.999Z");
  });

  it("uses the Karachi day, so a late-UTC `now` rolls the day forward", () => {
    // 19:30 UTC → 00:30 PKT on 2026-06-22
    const lateNow = new Date("2026-06-21T19:30:00Z");
    const r = resolveRange({ range: "today" }, lateNow, TZ);
    expect(iso(r.from)).toBe("2026-06-21T19:00:00.000Z"); // start of the 22nd
    expect(iso(r.to)).toBe("2026-06-22T18:59:59.999Z");
  });

  it("defaults the preset to last30 when none is given", () => {
    expect(DEFAULT_DATE_RANGE_PRESET).toBe("last30");
    expect(resolveRange({}, now, TZ)).toEqual(
      resolveRange({ range: "last30" }, now, TZ),
    );
  });
});

describe("resolveRange custom", () => {
  const now = new Date("2026-06-21T10:00:00Z");

  it("brackets the custom from/to dates inclusively", () => {
    const r = resolveRange(
      { range: "custom", from: "2026-01-01", to: "2026-01-31" },
      now,
      TZ,
    );
    expect(iso(r.from)).toBe("2025-12-31T19:00:00.000Z"); // start of Jan 1
    expect(iso(r.to)).toBe("2026-01-31T18:59:59.999Z"); // end of Jan 31
  });

  it("leaves a bound undefined when only one end is supplied", () => {
    const r = resolveRange({ range: "custom", from: "2026-01-01" }, now, TZ);
    expect(iso(r.from)).toBe("2025-12-31T19:00:00.000Z");
    expect(r.to).toBeUndefined();
  });
});
