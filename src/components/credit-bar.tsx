import { Money } from "@/components/money";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  outstandingPaisas: bigint | number;
  creditLimitPaisas: bigint | number;
  pendingPaisas?: bigint | number;
  className?: string;
};

export function CreditBar({
  outstandingPaisas,
  creditLimitPaisas,
  pendingPaisas,
  className,
}: Props) {
  const p = pct(outstandingPaisas, creditLimitPaisas);
  const tone =
    p >= 100 ? "bg-red-500" : p >= 85 ? "bg-amber-500" : "bg-emerald-500";
  const textTone =
    p >= 100 ? "text-red-700" : p >= 85 ? "text-amber-700" : "text-emerald-700";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>
          <Money paisas={outstandingPaisas} /> used
          {pendingPaisas && pendingPaisas > 0n ? (
            <>
              {" · "}
              <span className="text-amber-700">
                <Money paisas={pendingPaisas} /> pending
              </span>
            </>
          ) : null}
        </span>
        <span className={cn("font-semibold", textTone)}>{p}%</span>
      </div>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${p}%` }}
        />
      </div>
      <div className="text-muted-foreground text-xs">
        Limit: <Money paisas={creditLimitPaisas} />
      </div>
    </div>
  );
}
