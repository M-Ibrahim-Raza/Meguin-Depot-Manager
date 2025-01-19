import { APP_TIMEZONE } from "@/lib/constants";

/**
 * Timezone-aware date-range helpers shared by list filters.
 *
 * Day boundaries are computed in a fixed depot timezone ({@link APP_TIMEZONE})
 * so "today" / "last 7 days" mean the depot's calendar day regardless of where
 * the server runs (Neon is UTC) or which user's browser opens the page. All
 * functions are PURE — the current instant (`now`) is always injected, never
 * read from the clock — so they unit-test deterministically and have no hidden
 * `Date.now()`/`new Date()` dependency.
 *
 * Movements store `created_at` as a `timestamp`, so filtering by a calendar
 * range needs the exact UTC instants of local start-of-day and end-of-day. That
 * is what {@link resolveRange} produces; the tRPC `movements` procedure feeds
 * them straight into Drizzle `gte`/`lte`. Ranges are inclusive on both ends.
 */

export const DATE_RANGE_PRESETS = [
  "today",
  "last7",
  "last30",
  "thisMonth",
  "custom",
] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

/** The preset selected by default when none is supplied. */
export const DEFAULT_DATE_RANGE_PRESET: DateRangePreset = "last30";

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
  custom: "Custom",
};

/** The shape both the URL/query and `resolveRange` agree on. */
export type DateRangeFilter = {
  range?: DateRangePreset;
  /** `YYYY-MM-DD`, only meaningful when `range === "custom"`. */
  from?: string;
  /** `YYYY-MM-DD`, only meaningful when `range === "custom"`. */
  to?: string;
};

/**
 * Offset in ms at `date` for `tz` such that `wallClockAsUTC = instant + offset`.
 * For Asia/Karachi this is a constant +5h; computed generally via Intl so the
 * helper stays correct if the zone ever changes.
 */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  // `hour` can come back as 24 at midnight under h23 in some engines — clamp.
  const hour = map.hour === 24 ? 0 : map.hour;
  const wallAsUTC = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    hour,
    map.minute,
    map.second,
  );
  // formatToParts has no millisecond field, so compare against the instant
  // floored to the second — otherwise sub-second `date` (e.g. an end-of-day
  // `.999`) leaks into the offset and shifts the result by ~1s.
  const flooredToSecond = date.getTime() - date.getUTCMilliseconds();
  return wallAsUTC - flooredToSecond;
}

/** The UTC instant for a given wall-clock time on `ymd` in `tz`. */
function zonedTime(
  ymd: string,
  h: number,
  m: number,
  s: number,
  ms: number,
  tz: string,
): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  const wallAsUTC = Date.UTC(y, mo - 1, d, h, m, s, ms);
  // Solve instant T where wall(T) == wallAsUTC: T = wallAsUTC - offset(T).
  // Refine once so the result is exact across a DST transition (Karachi has
  // none, but this keeps the helper general).
  const offset1 = tzOffsetMs(new Date(wallAsUTC), tz);
  const offset2 = tzOffsetMs(new Date(wallAsUTC - offset1), tz);
  return new Date(wallAsUTC - offset2);
}

/** UTC instant of `00:00:00.000` on `ymd` in `tz`. */
export function zonedStartOfDay(ymd: string, tz: string = APP_TIMEZONE): Date {
  return zonedTime(ymd, 0, 0, 0, 0, tz);
}

/** UTC instant of `23:59:59.999` on `ymd` in `tz` (inclusive day end). */
export function zonedEndOfDay(ymd: string, tz: string = APP_TIMEZONE): Date {
  return zonedTime(ymd, 23, 59, 59, 999, tz);
}

/** The `YYYY-MM-DD` calendar day that `instant` falls on in `tz`. */
export function ymdInZone(instant: Date, tz: string = APP_TIMEZONE): string {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA renders as YYYY-MM-DD.
  return dtf.format(instant);
}

/** Add `delta` whole days to a `YYYY-MM-DD` string (pure calendar math). */
function addDaysYmd(ymd: string, delta: number): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** First day of the month containing `ymd`, as `YYYY-MM-DD`. */
function startOfMonthYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

/**
 * Resolve a filter to the concrete UTC instants to query against `created_at`.
 * Presets are relative to `now` (interpreted in `tz`); `custom` reads the
 * `from`/`to` date strings. Either bound may be `undefined` (no constraint) —
 * e.g. a `custom` range with only a start date. The SINGLE place day-boundary
 * math lives, reused by the server today and the export later.
 */
export function resolveRange(
  filter: DateRangeFilter,
  now: Date,
  tz: string = APP_TIMEZONE,
): { from?: Date; to?: Date } {
  const range = filter.range ?? DEFAULT_DATE_RANGE_PRESET;
  const today = ymdInZone(now, tz);

  switch (range) {
    case "today":
      return { from: zonedStartOfDay(today, tz), to: zonedEndOfDay(today, tz) };
    case "last7":
      return {
        from: zonedStartOfDay(addDaysYmd(today, -6), tz),
        to: zonedEndOfDay(today, tz),
      };
    case "last30":
      return {
        from: zonedStartOfDay(addDaysYmd(today, -29), tz),
        to: zonedEndOfDay(today, tz),
      };
    case "thisMonth":
      return {
        from: zonedStartOfDay(startOfMonthYmd(today), tz),
        to: zonedEndOfDay(today, tz),
      };
    case "custom":
      return {
        from: filter.from ? zonedStartOfDay(filter.from, tz) : undefined,
        to: filter.to ? zonedEndOfDay(filter.to, tz) : undefined,
      };
  }
}
