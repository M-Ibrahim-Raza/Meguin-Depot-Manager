"use client";

import {
  History,
  MoreHorizontal,
  Package,
  PackagePlus,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { fmtQty } from "@/features/stock/lib";
import { cn } from "@/lib/utils";
import type { StockListRow } from "@/server/db/repos/stock.repo";
import type { MovementMode } from "./stock-movement-dialog";
import { StockStatusBadge } from "./stock-status-badge";

type Props = {
  rows: StockListRow[];
  canManage: boolean;
  onMovement: (row: StockListRow, mode: MovementMode) => void;
  onReorder: (row: StockListRow) => void;
  onHistory: (row: StockListRow) => void;
};

export function StockTableBody({
  rows,
  canManage,
  onMovement,
  onReorder,
  onHistory,
}: Props) {
  return (
    <TableBody>
      {rows.map((r) => (
        <TableRow key={r.articleNumber}>
          <TableCell>
            <div className="font-medium">{r.name}</div>
            <div className="text-muted-foreground font-mono text-xs">
              {r.articleNumber}
            </div>
          </TableCell>
          <TableCell className="text-muted-foreground">{r.category}</TableCell>
          <TableCell className="text-muted-foreground text-right tabular-nums">
            {fmtQty(r.warehouseQty)}
          </TableCell>
          <TableCell className="text-muted-foreground text-right tabular-nums">
            {fmtQty(r.officeQty)}
          </TableCell>
          <TableCell className="text-right tabular-nums">
            <span
              className={cn(
                "font-medium",
                r.quantityOnHand <= 0 && "text-destructive",
              )}
            >
              {fmtQty(r.quantityOnHand)}
            </span>
            <span className="text-muted-foreground ml-1 text-xs">{r.unit}</span>
          </TableCell>
          <TableCell className="text-muted-foreground text-right tabular-nums">
            {r.reorderLevel == null ? "—" : fmtQty(r.reorderLevel)}
          </TableCell>
          <TableCell>
            <StockStatusBadge
              qty={r.quantityOnHand}
              reorderLevel={r.reorderLevel}
            />
          </TableCell>
          <TableCell>
            <RowActions
              canManage={canManage}
              onAdd={() => onMovement(r, "add")}
              onAdjust={() => onMovement(r, "adjust")}
              onOpening={() => onMovement(r, "opening")}
              onReorder={() => onReorder(r)}
              onHistory={() => onHistory(r)}
            />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

function RowActions({
  canManage,
  onAdd,
  onAdjust,
  onOpening,
  onReorder,
  onHistory,
}: {
  canManage: boolean;
  onAdd: () => void;
  onAdjust: () => void;
  onOpening: () => void;
  onReorder: () => void;
  onHistory: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Stock actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {canManage ? (
          <>
            <DropdownMenuItem onClick={onAdd}>
              <PackagePlus className="size-4" />
              Add stock
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAdjust}>
              <SlidersHorizontal className="size-4" />
              Adjust
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpening}>
              <Package className="size-4" />
              Set opening
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReorder}>
              <SlidersHorizontal className="size-4" />
              Reorder level
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onClick={onHistory}>
          <History className="size-4" />
          View history
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
