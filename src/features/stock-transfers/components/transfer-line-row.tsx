"use client";

import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtQty } from "@/features/stock/lib";
import { STOCK_LOCATION_LABELS, type StockLocation } from "@/lib/constants";
import type { Product } from "@/server/db/schema";

type Props = {
  product: Product;
  qty: number;
  available: number;
  short: boolean;
  fromLocation: StockLocation;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
};

export function TransferLineRow({
  product,
  qty,
  available,
  short,
  fromLocation,
  onQtyChange,
  onRemove,
}: Props) {
  return (
    <div
      className={
        short
          ? "border-destructive/50 bg-destructive/5 flex items-center gap-3 rounded-lg border p-3"
          : "flex items-center gap-3 rounded-lg border p-3"
      }
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{product.name}</div>
        <div className="text-muted-foreground text-xs">
          {fmtQty(available)} {product.unit} in{" "}
          {STOCK_LOCATION_LABELS[fromLocation]}
        </div>
        {short ? (
          <div className="text-destructive mt-0.5 text-xs font-medium">
            Exceeds available stock
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
        >
          <Minus className="size-3" />
        </Button>
        <Input
          type="number"
          inputMode="decimal"
          step="0.001"
          min={0}
          value={qty}
          onChange={(e) =>
            onQtyChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
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
    </div>
  );
}
