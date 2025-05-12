import { Badge } from "@/components/ui/badge";
import { STOCK_MOVEMENT_KIND_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { fmtQty } from "@/features/stock/lib";
import type { StockMovementKind } from "@/server/db/schema";

/** Badge styling per movement kind — labels come from `STOCK_MOVEMENT_KIND_LABELS`. */
export const MOVEMENT_KIND_UI: Record<
  StockMovementKind,
  { label: string; className: string }
> = {
  opening: {
    label: STOCK_MOVEMENT_KIND_LABELS.opening,
    className: "bg-muted text-foreground",
  },
  addition: {
    label: STOCK_MOVEMENT_KIND_LABELS.addition,
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
  adjustment: {
    label: STOCK_MOVEMENT_KIND_LABELS.adjustment,
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400",
  },
  sale: {
    label: STOCK_MOVEMENT_KIND_LABELS.sale,
    className:
      "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-400",
  },
  return: {
    label: STOCK_MOVEMENT_KIND_LABELS.return,
    className: "bg-muted text-foreground",
  },
  transfer_out: {
    label: STOCK_MOVEMENT_KIND_LABELS.transfer_out,
    className:
      "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-400",
  },
  transfer_in: {
    label: STOCK_MOVEMENT_KIND_LABELS.transfer_in,
    className:
      "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-400",
  },
};

export function MovementKindBadge({ kind }: { kind: string }) {
  const ui = MOVEMENT_KIND_UI[kind as StockMovementKind] ?? {
    label: kind,
    className: "bg-muted text-foreground",
  };
  return (
    <Badge variant="outline" className={ui.className}>
      {ui.label}
    </Badge>
  );
}

/** A signed delta like "+50" / "−4", coloured green/red. */
export function QtyDelta({ value }: { value: string | number }) {
  const n = Number(value);
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        n > 0 && "text-emerald-600 dark:text-emerald-400",
        n < 0 && "text-destructive",
      )}
    >
      {sign}
      {fmtQty(Math.abs(n))}
    </span>
  );
}
