"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductPicker, type PickerProduct } from "@/components/product-picker";
import { STOCK_LOCATION_LABELS, type StockLocation } from "@/lib/constants";
import type { Product } from "@/server/db/schema";

type Props = {
  products: Product[];
  pickedQty: Record<string, number>;
  availableByArticle: Map<string, number>;
  fromLocation: StockLocation;
  onPick: (product: PickerProduct) => void;
};

export function TransferPickCard({
  products,
  pickedQty,
  availableByArticle,
  fromLocation,
  onPick,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Pick from {STOCK_LOCATION_LABELS[fromLocation]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProductPicker
          products={products}
          pickedQty={pickedQty}
          availableByArticle={availableByArticle}
          onPick={onPick}
        />
      </CardContent>
    </Card>
  );
}
