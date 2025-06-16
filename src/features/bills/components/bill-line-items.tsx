"use client";

import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StockLocation } from "@/lib/constants";
import type { Product } from "@/server/db/schema";
import { resolveLineUnitPricePaisas } from "../lib";
import type { CreateBillInput } from "../schemas";
import { LineItemRow } from "@/components/line-item-row";

type FieldArrayItem = CreateBillInput["items"][number] & { id: string };

type Props = {
  fields: FieldArrayItem[];
  items: CreateBillInput["items"];
  productByArticle: Map<string, Product>;
  availByKey: Map<string, number>;
  itemsError?: string;
  onQtyChange: (idx: number, qty: number) => void;
  onLocationChange: (idx: number, location: StockLocation) => void;
  onSalePriceChange: (idx: number, rupees: number) => void;
  onRemove: (idx: number) => void;
};

/** The "Line items" card: the picked-product rows or the empty-state prompt. */
export function BillLineItems({
  fields,
  items,
  productByArticle,
  availByKey,
  itemsError,
  onQtyChange,
  onLocationChange,
  onSalePriceChange,
  onRemove,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Line items</span>
          <Badge variant="secondary">
            {fields.length} {fields.length === 1 ? "line" : "lines"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm">
            <ShoppingCart className="size-8" />
            Pick a product to add a line.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {fields.map((field, idx) => {
              const product = productByArticle.get(field.articleNumber);
              if (!product) return null;
              const item = items[idx] ?? field;
              const location = item.location ?? field.location;
              return (
                <LineItemRow
                  key={field.id}
                  name={product.name}
                  unit={product.unit}
                  qty={item.qty ?? field.qty}
                  unitPricePaisas={resolveLineUnitPricePaisas(item, product)}
                  basePricePaisas={product.pricePaisas}
                  location={location}
                  available={availByKey.get(
                    `${field.articleNumber}::${location}`,
                  )}
                  onQtyChange={(q) => onQtyChange(idx, q)}
                  onLocationChange={(loc) => onLocationChange(idx, loc)}
                  onPriceChange={(rupees) => onSalePriceChange(idx, rupees)}
                  onRemove={() => onRemove(idx)}
                />
              );
            })}
          </div>
        )}
        {itemsError ? (
          <p className="text-destructive mt-3 text-sm">{itemsError}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
