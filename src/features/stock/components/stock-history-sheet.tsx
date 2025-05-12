"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fmtQty } from "@/features/stock/lib";
import { STOCK_LOCATION_LABELS, type StockLocation } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { trpc } from "@/trpc/react";
import { MovementKindBadge, QtyDelta } from "./movement-display";

type Target = { articleNumber: string; name: string; unit: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target | null;
};

export function StockHistorySheet({ open, onOpenChange, target }: Props) {
  const { data, isLoading } = trpc.stock.movementsByArticle.useQuery(
    { articleNumber: target?.articleNumber ?? "" },
    { enabled: open && !!target },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Stock history</SheetTitle>
          <SheetDescription>{target ? target.name : ""}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No movements yet. Set opening stock to start tracking.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <MovementKindBadge kind={m.kind} />
                  <QtyDelta value={m.qtyDelta} />
                </div>
                <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
                  <span>
                    {fmtDate(m.createdAt)} ·{" "}
                    {STOCK_LOCATION_LABELS[m.location as StockLocation] ??
                      m.location}
                  </span>
                  <span className="tabular-nums">
                    Balance {fmtQty(m.balanceAfter)} {target?.unit}
                  </span>
                </div>
                {m.billNo && m.billCustomerId ? (
                  <Link
                    href={`/customers/${m.billCustomerId}/bills/${m.billId}/print`}
                    className="text-primary text-xs hover:underline"
                  >
                    Bill {m.billNo}
                  </Link>
                ) : null}
                {m.transferId ? (
                  <Link
                    href={`/stock/transfers/${m.transferId}/print`}
                    className="text-primary text-xs hover:underline"
                  >
                    Transfer slip
                  </Link>
                ) : null}
                {m.note ? (
                  <p className="text-muted-foreground text-xs italic">
                    “{m.note}”
                  </p>
                ) : null}
                {m.createdByName ? (
                  <p className="text-muted-foreground text-xs">
                    by {m.createdByName}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
