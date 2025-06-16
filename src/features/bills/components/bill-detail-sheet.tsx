"use client";

import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtQty } from "@/features/stock/lib";
import { fmtDate, lineTotalPaisas } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import { trpc } from "@/trpc/react";
import { BillStatusBadge } from "./bill-status-badge";

type Target = { billId: number; customerId: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target | null;
};

export function BillDetailSheet({ open, onOpenChange, target }: Props) {
  const { data, isLoading, error } = trpc.bills.byId.useQuery(
    { billId: target?.billId ?? 0, customerId: target?.customerId ?? 0 },
    { enabled: open && !!target },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{data ? data.bill.billNo : "Bill detail"}</SheetTitle>
          <SheetDescription>{data ? data.customer.name : ""}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : error ? (
          <p className="text-destructive rounded-lg border border-dashed p-6 text-center text-sm">
            {getErrorMessage(error)}
          </p>
        ) : data ? (
          <div className="flex flex-col gap-4">
            <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">
                    {data.customer.name}
                  </div>
                  {data.customer.area || data.customer.phone ? (
                    <div className="text-muted-foreground text-xs">
                      {[data.customer.area, data.customer.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </div>
                <Money
                  paisas={data.bill.amountPaisas}
                  className="text-xl font-bold"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BillStatusBadge
                  status={
                    data.bill.status as
                      | "paid"
                      | "unpaid"
                      | "pending_approval"
                      | "rejected"
                  }
                />
                <Badge variant="secondary" className="capitalize">
                  {data.bill.direction === "return" ? "Return" : data.bill.type}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {fmtDate(data.bill.date)}
                </span>
              </div>
              {data.bill.note ? (
                <p className="text-muted-foreground text-xs italic">
                  Note: {data.bill.note}
                </p>
              ) : null}
              {data.bill.status === "rejected" && data.bill.rejectReason ? (
                <p className="text-muted-foreground text-xs italic">
                  Rejected: {data.bill.rejectReason}
                </p>
              ) : null}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.nameSnapshot}</TableCell>
                    <TableCell>{item.unitSnapshot}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtQty(item.qty)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money paisas={item.unitPricePaisas} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money
                        paisas={lineTotalPaisas(
                          Number(item.qty),
                          item.unitPricePaisas,
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t pt-3 text-base font-bold">
              <span>Total</span>
              <Money paisas={data.bill.amountPaisas} />
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
