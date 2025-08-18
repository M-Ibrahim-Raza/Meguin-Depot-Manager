"use client";

import { LineItemRow } from "@/components/line-item-row";
import type { ReturnableProduct } from "@/server/db/repos/returns.repo";
import type { ReturnLineInput } from "../schemas";

type Field = ReturnLineInput & { id: string };

type Props = {
  fields: Field[];
  items: ReturnLineInput[];
  returnableByArticle: Map<string, ReturnableProduct>;
  onQtyChange: (idx: number, qty: number) => void;
  onRemove: (idx: number) => void;
};

export function ReturnItemsList({
  fields,
  items,
  returnableByArticle,
  onQtyChange,
  onRemove,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {fields.map((field, idx) => {
        const r = returnableByArticle.get(field.articleNumber);
        if (!r) return null;
        return (
          <LineItemRow
            key={field.id}
            name={r.name}
            unit={r.unit}
            qty={items[idx]?.qty ?? field.qty}
            unitPricePaisas={r.latestUnitPricePaisas}
            available={r.returnableQty}
            onQtyChange={(q) => onQtyChange(idx, q)}
            onRemove={() => onRemove(idx)}
          />
        );
      })}
    </div>
  );
}
