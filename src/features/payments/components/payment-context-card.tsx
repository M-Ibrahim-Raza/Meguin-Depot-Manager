import { ApprovalBadge } from "@/components/approval-badge";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import {
  PAYMENT_METHOD_LABELS,
  type ApprovalStatus,
  type PaymentMethod,
} from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { PaymentWithCustomer } from "@/server/db/repos/payments.repo";

type Props = {
  payment: PaymentWithCustomer;
};

/**
 * The payment summary block shown at the top of any dialog that acts on a
 * payment — customer, payId·date, amount, method badge, approval badge, note.
 * Shared by the approve/reject flow and the reversal request/review flow so
 * both surfaces present the same payment context identically.
 */
export function PaymentContextCard({ payment }: Props) {
  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{payment.customerName}</div>
          <div className="text-muted-foreground text-xs">
            {payment.payId} · {fmtDate(payment.date)}
          </div>
        </div>
        <Money paisas={payment.amountPaisas} className="text-xl font-bold" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ??
            payment.method}
        </Badge>
        <ApprovalBadge approval={payment.approval as ApprovalStatus} />
        {payment.note ? (
          <span className="text-muted-foreground text-xs">{payment.note}</span>
        ) : null}
      </div>
    </div>
  );
}
