import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { stockStatus, type StockStatus } from "@/features/stock/lib";

const STATUS_UI: Record<StockStatus, { label: string; className: string }> = {
  out: {
    label: "Out",
    className:
      "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20",
  },
  low: {
    label: "Low",
    className:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400",
  },
  ok: {
    label: "OK",
    className:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400",
  },
};

export function StockStatusBadge({
  qty,
  reorderLevel,
  className,
}: {
  qty: number;
  reorderLevel: number | null;
  className?: string;
}) {
  const ui = STATUS_UI[stockStatus(qty, reorderLevel)];
  return (
    <Badge variant="outline" className={cn(ui.className, className)}>
      {ui.label}
    </Badge>
  );
}
