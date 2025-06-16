"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/money";
import { fmtQty } from "@/features/stock/lib";
import { cn } from "@/lib/utils";
import type { Product } from "@/server/db/schema";

/**
 * The product fields the picker actually renders. A real `Product` satisfies it,
 * and so do the return-flow's returnable products (priced at the latest sale
 * price) — so both bill creation and returns share this component.
 */
export type PickerProduct = Pick<
  Product,
  "articleNumber" | "name" | "unit" | "category" | "pricePaisas"
>;

type Props = {
  products: PickerProduct[];
  /** articleNumber → current qty in cart (or 0). Used to highlight picked items. */
  pickedQty: Record<string, number>;
  /** articleNumber → live available stock (or returnable qty for returns). */
  availableByArticle?: Map<string, number>;
  /**
   * Optional per-location breakdown (bill flow). When present, the card shows
   * "Warehouse x · Office y" instead of a single total.
   */
  locationAvailability?: Map<string, { warehouse: number; office: number }>;
  onPick: (product: PickerProduct) => void;
};

export function ProductPicker({
  products,
  pickedQty,
  availableByArticle,
  locationAvailability,
  onPick,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");

  const filters = useMemo(
    () => [
      "All",
      ...Array.from(new Set(products.map((p) => p.category))).sort(),
    ],
    [products],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filter !== "All" && p.category !== filter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, filter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="pl-8"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            type="button"
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {visible.length === 0 ? (
          <div className="text-muted-foreground col-span-full rounded-lg border border-dashed p-6 text-center text-sm">
            No products match.
          </div>
        ) : (
          visible.map((p) => {
            const qty = pickedQty[p.articleNumber] ?? 0;
            const picked = qty > 0;
            const available = availableByArticle?.get(p.articleNumber);
            const out = available != null && available <= 0;
            return (
              <button
                type="button"
                key={p.articleNumber}
                onClick={() => onPick(p)}
                className={cn(
                  "relative rounded-lg border p-3 text-left transition-colors",
                  picked
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/40 bg-background",
                )}
              >
                {picked ? (
                  <span className="bg-primary text-primary-foreground absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs font-semibold">
                    ×{qty}
                  </span>
                ) : null}
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {p.unit}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    {p.category}
                  </Badge>
                  <Money paisas={p.pricePaisas} className="text-sm font-bold" />
                </div>
                {locationAvailability?.has(p.articleNumber) ? (
                  (() => {
                    const loc = locationAvailability.get(p.articleNumber)!;
                    const total = loc.warehouse + loc.office;
                    return (
                      <div
                        className={cn(
                          "mt-1.5 text-[11px] font-medium",
                          total <= 0
                            ? "text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {total <= 0
                          ? "Out of stock"
                          : `WH ${fmtQty(loc.warehouse)} · Office ${fmtQty(loc.office)}`}
                      </div>
                    );
                  })()
                ) : available != null ? (
                  <div
                    className={cn(
                      "mt-1.5 text-[11px] font-medium",
                      out ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {out
                      ? "Out of stock"
                      : `${fmtQty(available)} ${p.unit} left`}
                  </div>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
