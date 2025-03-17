import { fmtPaisas } from "@/lib/format";
import { cn } from "@/lib/utils";

type MoneyProps = {
  paisas: bigint | number | null | undefined;
  className?: string;
};

export function Money({ paisas, className }: MoneyProps) {
  return (
    <span className={cn("tabular-nums", className)}>{fmtPaisas(paisas)}</span>
  );
}
