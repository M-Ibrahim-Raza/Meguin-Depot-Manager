// Parsers come from the isomorphic `nuqs/server` entry so the server page can
// build a `createSearchParamsCache` from them; the client feed reuses the same
// objects via `useQueryStates`. (Importing them from `nuqs` marks them
// client-only and breaks the server-side parse.)
import { parseAsString, parseAsStringEnum } from "nuqs/server";
import { STOCK_LOCATIONS, type StockLocation } from "@/lib/constants";
import {
  DATE_RANGE_PRESETS,
  DEFAULT_DATE_RANGE_PRESET,
  type DateRangePreset,
} from "@/lib/date-range";
import {
  STOCK_MOVEMENT_KINDS,
  type StockMovementKind,
} from "@/server/db/schema";

/**
 * The single source of truth for the movements-log URL filter, shared by the
 * client feed (`useQueryStates`) and the server page (nuqs
 * `createSearchParamsCache`) so both parse the URL identically. Isomorphic — it
 * only imports the isomorphic `nuqs` parsers (no server-only code), so it is
 * safe to pull into both bundles.
 */
export const movementsParsers = {
  range: parseAsStringEnum<DateRangePreset>([
    ...DATE_RANGE_PRESETS,
  ]).withDefault(DEFAULT_DATE_RANGE_PRESET),
  from: parseAsString,
  to: parseAsString,
  kind: parseAsStringEnum<StockMovementKind>([...STOCK_MOVEMENT_KINDS]),
  location: parseAsStringEnum<StockLocation>([...STOCK_LOCATIONS]),
};

/** Rows per page for the infinite-scroll feed (mirrors the repo default). */
export const MOVEMENTS_PAGE_SIZE = 50;

export type MovementsFilterValues = {
  range: DateRangePreset;
  from: string | null;
  to: string | null;
  kind: StockMovementKind | null;
  location: StockLocation | null;
};

/** Map the URL filter values to the tRPC `movements` query input. */
export function buildMovementsQueryInput(
  v: MovementsFilterValues,
  limit: number = MOVEMENTS_PAGE_SIZE,
) {
  return {
    range: v.range,
    // from/to only matter for a custom range — drop them otherwise so presets
    // resolve cleanly on the server.
    from: v.range === "custom" ? (v.from ?? undefined) : undefined,
    to: v.range === "custom" ? (v.to ?? undefined) : undefined,
    kind: v.kind ?? undefined,
    location: v.location ?? undefined,
    limit,
  };
}

/** True when any filter differs from the default landing view. */
export function hasActiveMovementsFilter(v: MovementsFilterValues): boolean {
  return (
    v.range !== DEFAULT_DATE_RANGE_PRESET ||
    v.kind != null ||
    v.location != null
  );
}
