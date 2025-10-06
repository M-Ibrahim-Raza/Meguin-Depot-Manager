"use client";

import { ArrowRight } from "lucide-react";
import { FormItem, FormLabel } from "@/components/ui/form";
import { otherLocation } from "@/features/stock-transfers/lib";
import {
  STOCK_LOCATION_LABELS,
  STOCK_LOCATIONS,
  type StockLocation,
} from "@/lib/constants";

type Props = {
  fromLocation: StockLocation;
  toLocation: StockLocation;
  onSelect: (from: StockLocation) => void;
};

export function DirectionSelector({
  fromLocation,
  toLocation,
  onSelect,
}: Props) {
  // Only two locations, so the direction is a binary choice: pick a source and
  // the destination is always the other location.
  const directions: Array<{ from: StockLocation; to: StockLocation }> =
    STOCK_LOCATIONS.map((from) => ({ from, to: otherLocation(from) }));

  return (
    <FormItem>
      <FormLabel>Direction</FormLabel>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {directions.map((d) => {
          const active = d.from === fromLocation && d.to === toLocation;
          return (
            <button
              type="button"
              key={`${d.from}-${d.to}`}
              onClick={() => onSelect(d.from)}
              className={
                active
                  ? "border-primary bg-primary text-primary-foreground inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium"
                  : "border-input bg-background hover:bg-muted inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium"
              }
            >
              {STOCK_LOCATION_LABELS[d.from]}
              <ArrowRight className="size-3.5" />
              {STOCK_LOCATION_LABELS[d.to]}
            </button>
          );
        })}
      </div>
    </FormItem>
  );
}
