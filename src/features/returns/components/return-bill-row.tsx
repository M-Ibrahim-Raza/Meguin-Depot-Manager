import { Printer, Undo2 } from "lucide-react";
import Link from "next/link";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BillStatusBadge } from "@/features/bills/components/bill-status-badge";
import { fmtDate } from "@/lib/format";
import type { ReturnBillWithCreator } from "@/server/db/repos/customers.repo";

type Props = {
  bill: ReturnBillWithCreator;
  canApprove?: boolean;
  onApproveClick?: () => void;
  /** Customer name (optionally with area) — shown on the global Bills page, omitted on a customer's own detail page where it's implicit. */
  customerLabel?: string;
};

/** A single return bill (credit note) in the customer's Return Bills tab. */
export function ReturnBillRow({
  bill,
  canApprove = false,
  onApproveClick,
  customerLabel,
}: Props) {
  const isPending = bill.status === "pending_approval";
  const isRejected = bill.status === "rejected";

  return (
    <Card className="flex flex-row items-center justify-between p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{bill.billNo}</span>
          <BillStatusBadge
            status={
              bill.status as "paid" | "unpaid" | "pending_approval" | "rejected"
            }
          />
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive"
          >
            <Undo2 className="size-3" />
            Return
          </Badge>
        </div>
        {customerLabel ? (
          <div className="mt-0.5 text-sm font-medium">{customerLabel}</div>
        ) : null}
        <div className="text-muted-foreground mt-1 text-xs">
          {fmtDate(bill.date)}
          {bill.note ? ` · ${bill.note}` : ""}
          {bill.createdByName ? ` · by ${bill.createdByName}` : ""}
        </div>
        {isRejected && bill.rejectReason ? (
          <div className="text-muted-foreground mt-1 text-xs italic">
            Rejected: {bill.rejectReason}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col items-end gap-1">
        <Money
          paisas={bill.amountPaisas}
          className="text-destructive text-base font-bold"
        />
        {isPending && canApprove ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={onApproveClick}
          >
            Review
          </Button>
        ) : (
          <Link
            href={`/customers/${bill.customerId}/bills/${bill.id}/print`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "h-7 px-2 text-xs",
            })}
          >
            <Printer className="size-3.5" />
            Print
          </Link>
        )}
      </div>
    </Card>
  );
}
