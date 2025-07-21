import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LedgerKind } from "../ledger";
import { KIND_META, LEDGER_KIND_ORDER } from "./ledger-row";

type Props = {
  /** Currently-included entry kinds. */
  kinds: Set<LedgerKind>;
  onToggleKind: (kind: LedgerKind) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasActiveFilter: boolean;
  onClear: () => void;
};

/** Left-hand filtration panel for the customer ledger; open by default. */
export function LedgerFilters({
  kinds,
  onToggleKind,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  open,
  onOpenChange,
  hasActiveFilter,
  onClear,
}: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="-m-1 flex items-center justify-between rounded-md p-1 text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            Filters
          </span>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              !open && "-rotate-90",
            )}
          />
        </button>

        {open ? (
          <div className="flex flex-col gap-4">
            <Field label="Show">
              <div className="flex flex-col gap-1.5">
                {LEDGER_KIND_ORDER.map((kind) => {
                  const { Icon, label } = KIND_META[kind];
                  const active = kinds.has(kind);
                  return (
                    <Button
                      key={kind}
                      type="button"
                      size="sm"
                      variant={active ? "secondary" : "outline"}
                      onClick={() => onToggleKind(kind)}
                      aria-pressed={active}
                      className={cn(
                        "justify-start",
                        !active && "text-muted-foreground",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {label}
                    </Button>
                  );
                })}
              </div>
            </Field>

            <Field label="From">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                aria-label="From date"
              />
            </Field>

            <Field label="To">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                aria-label="To date"
              />
            </Field>

            {hasActiveFilter ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onClear}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </div>
      {children}
    </div>
  );
}
