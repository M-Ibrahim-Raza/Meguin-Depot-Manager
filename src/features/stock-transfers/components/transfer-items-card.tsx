"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type StockLocation } from "@/lib/constants";
import type { Product } from "@/server/db/schema";
import { TransferLineRow } from "./transfer-line-row";

type Line = { id: string; articleNumber: string; qty: number };

type Props = {
  fields: Line[];
  items: { articleNumber: string; qty: number }[];
  productByArticle: Map<string, Product>;
  availableByArticle: Map<string, number>;
  fromLocation: StockLocation;
  itemsError?: string;
  onQtyChange: (idx: number, qty: number) => void;
  onRemove: (idx: number) => void;
};

export function TransferItemsCard({
  fields,
  items,
  productByArticle,
  availableByArticle,
  fromLocation,
  itemsError,
  onQtyChange,
  onRemove,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Items to move</span>
          <Badge variant="secondary">
            {fields.length} {fields.length === 1 ? "line" : "lines"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {fields.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            Pick a product to add a line.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {fields.map((field, idx) => {
              const product = productByArticle.get(field.articleNumber);
              if (!product) return null;
              const qty = items[idx]?.qty ?? field.qty;
              const available =
                availableByArticle.get(field.articleNumber) ?? 0;
              const short = qty > available;
              return (
                <TransferLineRow
                  key={field.id}
                  product={product}
                  qty={qty}
                  available={available}
                  short={short}
                  fromLocation={fromLocation}
                  onQtyChange={(q) => onQtyChange(idx, q)}
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
