"use client";

import { useState } from "react";
import { Minus, Pencil, Plus, X } from "lucide-react";
import { AmountInput } from "@/components/ui/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/money";
import { MoneyDelta } from "@/components/money-delta";
import { fmtQty } from "@/features/stock/lib";
import { paisasToRupees } from "@/lib/format";
import {
  STOCK_LOCATIONS,
  STOCK_LOCATION_LABELS,
  type StockLocation,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  unit: string;
  qty: number;
  unitPricePaisas: bigint | number;
  /** Which location this line draws from. Omit to hide the location toggle. */
  location?: StockLocation;
  /** Live stock available at the selected location (undefined = not checked). */
  available?: number;
  onQtyChange: (qty: number) => void;
  /** Provide with `location` to show the Warehouse/Office toggle. */
  onLocationChange?: (location: StockLocation) => void;
  onRemove: () => void;
  /** The product's catalogue price. Provide together with `onPriceChange` to
   * let this line be sold above it (an upsell) — omit both to keep the price
   * read-only, as returns do. */
  basePricePaisas?: bigint;
  /** Presence (with `basePricePaisas`) enables the click-to-edit price control. */
  onPriceChange?: (rupees: number) => void;
};

export function LineItemRow({
  name,
  unit,
  qty,
  unitPricePaisas,
  location,
  available,
  onQtyChange,
  onLocationChange,
  onRemove,
  basePricePaisas,
  onPriceChange,
}: Props) {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const linePaisas = BigInt(Math.round(qty * Number(unitPricePaisas)));
  const short = available != null && qty > available;

  const canEditPrice = basePricePaisas != null && !!onPriceChange;
  const unitPaisas =
    typeof unitPricePaisas === "bigint"
      ? unitPricePaisas
      : BigInt(Math.round(unitPricePaisas));
  const upsellPaisas =
    basePricePaisas != null ? unitPaisas - basePricePaisas : 0n;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3",
        short && "border-destructive/50 bg-destructive/5",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="text-muted-foreground text-xs">
          {canEditPrice && isEditingPrice ? (
            <span className="inline-flex items-center gap-1">
              {unit} ·
              <AmountInput
                value={paisasToRupees(unitPaisas)}
                onChange={(rupees) => onPriceChange?.(rupees)}
                onBlur={() => setIsEditingPrice(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    e.currentTarget.blur();
                  }
                }}
                autoFocus
                className="h-6 w-20 px-1.5 text-xs"
              />
              per unit
            </span>
          ) : canEditPrice ? (
            <button
              type="button"
              onClick={() => setIsEditingPrice(true)}
              className="hover:text-foreground"
            >
              {unit} · <Money paisas={unitPricePaisas} /> per unit{" "}
              <Pencil className="inline size-2.5 opacity-40" />
            </button>
          ) : (
            <span>
              {unit} · <Money paisas={unitPricePaisas} /> per unit
            </span>
          )}
        </div>
        {upsellPaisas > 0n ? (
          <div className="text-xs">
            <MoneyDelta paisas={upsellPaisas} /> per unit
          </div>
        ) : null}
        {location && onLocationChange ? (
          <div className="mt-1.5 inline-flex overflow-hidden rounded-md border">
            {STOCK_LOCATIONS.map((loc) => (
              <button
                type="button"
                key={loc}
                onClick={() => onLocationChange(loc)}
                className={cn(
                  "px-2 py-0.5 text-xs font-medium transition-colors",
                  location === loc
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {STOCK_LOCATION_LABELS[loc]}
              </button>
            ))}
          </div>
        ) : null}
        {short ? (
          <div className="text-destructive mt-0.5 text-xs font-medium">
            Only {fmtQty(available)} {unit}
            {location ? ` in ${STOCK_LOCATION_LABELS[location]}` : ""}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="size-7 p-0"
          aria-label="Decrease quantity"
          onClick={() => onQtyChange(Math.max(0, +(qty - 1).toFixed(3)))}
          disabled={qty <= 0}
        >
          <Minus className="size-3" />
        </Button>
        <Input
          type="number"
          inputMode="decimal"
          step="0.001"
          min={0}
          value={qty}
          onChange={(e) => {
            const v = e.target.value;
            onQtyChange(v === "" ? 0 : Number(v));
          }}
          className="h-7 w-16 text-center tabular-nums"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="size-7 p-0"
          aria-label="Increase quantity"
          onClick={() => onQtyChange(+(qty + 1).toFixed(3))}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      <div className="w-24 text-right">
        <Money paisas={linePaisas} className="text-sm font-semibold" />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive size-7 p-0"
        aria-label="Remove line"
        onClick={onRemove}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
