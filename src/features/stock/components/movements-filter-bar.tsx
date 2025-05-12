"use client";

import { Tag, Warehouse } from "lucide-react";
import {
  DateRangePicker,
  type DateRangeValue,
} from "@/components/date-range-picker";
import { Button } from "@/components/ui/button";
import { FilterSelectValue } from "@/components/ui/filter-select-value";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  STOCK_LOCATION_LABELS,
  STOCK_LOCATIONS,
  type StockLocation,
} from "@/lib/constants";
import {
  STOCK_MOVEMENT_KINDS,
  type StockMovementKind,
} from "@/server/db/schema";
import { MOVEMENT_KIND_UI } from "./movement-display";

type KindFilter = StockMovementKind | "all";
type LocationFilter = StockLocation | "all";

type Props = {
  date: DateRangeValue;
  onDateChange: (value: DateRangeValue) => void;
  kind: KindFilter;
  onKindChange: (value: KindFilter) => void;
  location: LocationFilter;
  onLocationChange: (value: LocationFilter) => void;
  hasActiveFilter: boolean;
  onClear: () => void;
};

/** Presentational filter bar: date range + kind + location + clear. State is owned by the feed. */
export function MovementsFilterBar({
  date,
  onDateChange,
  kind,
  onKindChange,
  location,
  onLocationChange,
  hasActiveFilter,
  onClear,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      <DateRangePicker value={date} onChange={onDateChange} />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={kind}
          onValueChange={(v) => onKindChange((v ?? "all") as KindFilter)}
        >
          <SelectTrigger className="w-44">
            <FilterSelectValue
              icon={Tag}
              label="Kind"
              render={(value) =>
                value === "all"
                  ? "All"
                  : (MOVEMENT_KIND_UI[value as StockMovementKind]?.label ??
                    value)
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            {STOCK_MOVEMENT_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {MOVEMENT_KIND_UI[k]?.label ?? k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={location}
          onValueChange={(v) =>
            onLocationChange((v ?? "all") as LocationFilter)
          }
        >
          <SelectTrigger className="w-44">
            <FilterSelectValue
              icon={Warehouse}
              label="Location"
              render={(value) =>
                value === "all"
                  ? "All"
                  : (STOCK_LOCATION_LABELS[value as StockLocation] ?? value)
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {STOCK_LOCATIONS.map((l) => (
              <SelectItem key={l} value={l}>
                {STOCK_LOCATION_LABELS[l]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilter ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onClear}
            className="ml-auto"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
