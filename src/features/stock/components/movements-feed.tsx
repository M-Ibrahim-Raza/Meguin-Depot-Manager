"use client";

import { ArrowLeft, Loader2, MapPin, Tags } from "lucide-react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { useState } from "react";
import type { DateRangeValue } from "@/components/date-range-picker";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/features/export/components/export-button";
import { ExportFilterSelect } from "@/features/export/components/export-filter-select";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { DEFAULT_DATE_RANGE_PRESET } from "@/lib/date-range";
import {
  STOCK_LOCATIONS,
  STOCK_LOCATION_LABELS,
  STOCK_MOVEMENT_KIND_LABELS,
  type StockLocation,
} from "@/lib/constants";
import type { StockMovementPage } from "@/server/db/repos/stock.repo";
import {
  STOCK_MOVEMENT_KINDS,
  type StockMovementKind,
} from "@/server/db/schema";
import type { ExportColumnMeta } from "@/server/export/types";
import { trpc } from "@/trpc/react";
import { MovementsFilterBar } from "./movements-filter-bar";
import { MovementsTable } from "./movements-table";
import {
  buildMovementsQueryInput,
  hasActiveMovementsFilter,
  movementsParsers,
} from "./movements-search-params";

type KindFilter = StockMovementKind | "all";
type LocationFilter = StockLocation | "all";

type Props = {
  /** The first page, prefetched on the server for the URL's filter state. */
  initialPage: StockMovementPage;
  exportColumns?: ExportColumnMeta[];
};

export function MovementsFeed({ initialPage, exportColumns }: Props) {
  const [filters, setFilters] = useQueryStates(movementsParsers, {
    history: "replace",
    clearOnDefault: true,
  });

  // The filter state at mount === what the server prefetched, so the seeded
  // first page is only valid while the filter is unchanged. After any change
  // react-query owns a fresh key and fetches live.
  const [initial] = useState(filters);
  const isInitial =
    filters.range === initial.range &&
    filters.from === initial.from &&
    filters.to === initial.to &&
    filters.kind === initial.kind &&
    filters.location === initial.location;

  const query = trpc.stock.movements.useInfiniteQuery(
    buildMovementsQueryInput(filters),
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialCursor: undefined,
      initialData: isInitial
        ? { pages: [initialPage], pageParams: [undefined] }
        : undefined,
    },
  );

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const showSkeleton = items.length === 0 && query.isLoading;
  const showEmpty = items.length === 0 && !query.isLoading;

  const sentinelRef = useInfiniteScroll(() => query.fetchNextPage(), {
    disabled: !query.hasNextPage || query.isFetchingNextPage,
  });

  const date: DateRangeValue = {
    range: filters.range,
    from: filters.from ?? undefined,
    to: filters.to ?? undefined,
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/stock"
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "mb-2 -ml-2",
            })}
          >
            <ArrowLeft className="size-4" />
            Back to Stock
          </Link>
          <h1 className="text-2xl font-semibold">Stock activity</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every stock change across all products, newest first.
          </p>
        </div>
        {exportColumns ? (
          <ExportButton
            resource="stock-movements"
            title="Stock Activity"
            columns={exportColumns}
            showDateRange
            initialFilters={{
              kind: filters.kind ?? "all",
              location: filters.location ?? "all",
            }}
            renderFilters={({ filters: f, setFilter }) => (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ExportFilterSelect
                  label="Kind"
                  icon={Tags}
                  value={f.kind ?? "all"}
                  onChange={(v) => setFilter("kind", v)}
                  options={STOCK_MOVEMENT_KINDS}
                  optionLabels={STOCK_MOVEMENT_KIND_LABELS}
                  allLabel="All kinds"
                />
                <ExportFilterSelect
                  label="Location"
                  icon={MapPin}
                  value={f.location ?? "all"}
                  onChange={(v) => setFilter("location", v)}
                  options={STOCK_LOCATIONS}
                  optionLabels={STOCK_LOCATION_LABELS}
                  allLabel="All locations"
                />
              </div>
            )}
          />
        ) : null}
      </div>

      <MovementsFilterBar
        date={date}
        onDateChange={(v) =>
          setFilters({ range: v.range, from: v.from ?? null, to: v.to ?? null })
        }
        kind={filters.kind ?? "all"}
        onKindChange={(k: KindFilter) =>
          setFilters({ kind: k === "all" ? null : k })
        }
        location={filters.location ?? "all"}
        onLocationChange={(l: LocationFilter) =>
          setFilters({ location: l === "all" ? null : l })
        }
        hasActiveFilter={hasActiveMovementsFilter(filters)}
        onClear={() =>
          setFilters({
            range: DEFAULT_DATE_RANGE_PRESET,
            from: null,
            to: null,
            kind: null,
            location: null,
          })
        }
      />

      {showSkeleton ? (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : showEmpty ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-12 text-center text-sm">
          No stock movements in this range.
        </p>
      ) : (
        <>
          <MovementsTable items={items} />
          {/* Sentinel: scrolling near it pulls the next page. */}
          <div
            ref={sentinelRef}
            className="text-muted-foreground flex h-8 items-center justify-center text-xs"
          >
            {query.isFetchingNextPage ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                Loading more…
              </span>
            ) : !query.hasNextPage ? (
              <span>End of activity</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
