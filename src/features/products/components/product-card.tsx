"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Money } from "@/components/money";
import type { Product } from "@/server/db/schema";

type Props = {
  product: Product;
  canEdit: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export function ProductCard({ product, canEdit, onEdit, onDelete }: Props) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <CardContent className="flex items-start justify-between gap-2 p-0">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{product.name}</h3>
          <p className="text-muted-foreground mt-0.5 font-mono text-xs">
            {product.articleNumber}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">{product.unit}</p>
          <Badge variant="secondary" className="mt-2">
            {product.category}
          </Badge>
        </div>
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground -mt-1 -mr-2 size-7"
                  aria-label="Product actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(product)}
                variant="destructive"
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardContent>
      <div className="mt-1 flex items-baseline justify-between">
        <Money paisas={product.pricePaisas} className="text-lg font-bold" />
        <span className="text-muted-foreground text-xs">per unit</span>
      </div>
    </Card>
  );
}
