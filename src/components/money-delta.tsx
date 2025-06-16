import { Money } from "@/components/money";
import { cn } from "@/lib/utils";

type MoneyDeltaProps = {
  paisas: bigint;
  className?: string;
};

/** A signed money delta like "+Rs. 50" / "−Rs. 50", coloured green/red — the
 * money equivalent of `QtyDelta` (`features/stock/components/movement-display.tsx`).
 * Renders nothing for a zero delta. */
export function MoneyDelta({ paisas, className }: MoneyDeltaProps) {
  if (paisas === 0n) return null;
  const positive = paisas > 0n;
  return (
    <span
      className={cn(
        "font-medium",
        positive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-destructive",
        className,
      )}
    >
      {positive ? "+" : "−"}
      <Money paisas={positive ? paisas : -paisas} />
    </span>
  );
}
