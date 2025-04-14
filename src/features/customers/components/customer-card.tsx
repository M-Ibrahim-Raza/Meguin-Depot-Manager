import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  Phone,
  Clock,
  Wallet,
  Undo2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditBar } from "@/components/credit-bar";
import { StatusBadge } from "@/components/status-badge";
import { getStatus } from "@/lib/format";
import type { Customer } from "@/server/db/schema";

type Props = {
  customer: Customer;
  pendingBillCount?: number;
  pendingPaymentCount?: number;
  pendingReturnBillCount?: number;
};

export function CustomerCard({
  customer,
  pendingBillCount = 0,
  pendingPaymentCount = 0,
  pendingReturnBillCount = 0,
}: Props) {
  const status = getStatus(
    customer.outstandingPaisas,
    customer.creditLimitPaisas,
  );

  return (
    <Link
      href={`/customers/${customer.id}`}
      className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
    >
      <Card className="hover:border-primary/30 flex flex-col gap-3 p-4 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">
                {customer.name}
              </h3>
              {pendingBillCount > 0 ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-amber-200 bg-amber-50 text-amber-700"
                >
                  <Clock className="mr-1 size-3" />
                  {pendingBillCount}
                </Badge>
              ) : null}
              {pendingPaymentCount > 0 ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-blue-200 bg-blue-50 text-blue-700"
                >
                  <Wallet className="mr-1 size-3" />
                  {pendingPaymentCount}
                </Badge>
              ) : null}
              {pendingReturnBillCount > 0 ? (
                <Badge
                  variant="outline"
                  className="shrink-0 border-violet-200 bg-violet-50 text-violet-700"
                >
                  <Undo2 className="mr-1 size-3" />
                  {pendingReturnBillCount}
                </Badge>
              ) : null}
            </div>
            <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              {customer.area ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {customer.area}
                </span>
              ) : null}
              {customer.phone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {customer.phone}
                </span>
              ) : null}
            </div>
          </div>
          <ChevronRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        </div>
        <div className="flex items-center justify-between">
          <StatusBadge status={status} />
        </div>
        <CreditBar
          outstandingPaisas={customer.outstandingPaisas}
          creditLimitPaisas={customer.creditLimitPaisas}
        />
      </Card>
    </Link>
  );
}
