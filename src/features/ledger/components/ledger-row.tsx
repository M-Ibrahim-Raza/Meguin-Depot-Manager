import { Receipt, RotateCcw, Undo2, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  LEDGER_KIND_LABELS,
  LEDGER_KIND_ORDER,
  type LedgerEntry,
  type LedgerKind,
} from "../ledger";

export { LEDGER_KIND_ORDER };

export const KIND_META: Record<
  LedgerKind,
  { Icon: LucideIcon; label: string; badgeClass: string }
> = {
  sale: {
    Icon: Receipt,
    label: LEDGER_KIND_LABELS.sale,
    badgeClass: "border-border bg-muted text-foreground/80",
  },
  return: {
    Icon: Undo2,
    label: LEDGER_KIND_LABELS.return,
    badgeClass: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  payment: {
    Icon: Wallet,
    label: LEDGER_KIND_LABELS.payment,
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  payment_reversal: {
    Icon: RotateCcw,
    label: LEDGER_KIND_LABELS.payment_reversal,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-900",
  },
};

/** One ledger entry (sale / return / payment) with its running balance. */
export function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const { Icon, label, badgeClass } = KIND_META[entry.kind];
  const isCredit = entry.effect === "credit";
  const isReturn = entry.kind === "return";

  return (
    <Card className="flex flex-row items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("gap-1", badgeClass)}>
            <Icon className="size-3" />
            {label}
          </Badge>
          <span className="text-sm font-semibold">{entry.ref}</span>
        </div>
        <div className="text-muted-foreground mt-1 text-xs">
          {fmtDate(entry.date)}
          {entry.note ? ` · ${entry.note}` : ""}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <div
          className={cn(
            "text-base font-bold",
            isReturn
              ? "text-destructive"
              : isCredit
                ? "text-emerald-700"
                : undefined,
          )}
        >
          {isCredit ? "− " : ""}
          <Money paisas={entry.amountPaisas} />
        </div>
        <div className="text-muted-foreground text-xs">
          Bal: <Money paisas={entry.balancePaisas} />
        </div>
      </div>
    </Card>
  );
}
