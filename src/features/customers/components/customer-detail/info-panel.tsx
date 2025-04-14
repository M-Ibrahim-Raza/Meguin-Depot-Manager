import { Money } from "@/components/money";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDate } from "@/lib/format";
import type { Customer } from "@/server/db/schema";

type Props = {
  customer: Customer;
};

export function InfoPanel({ customer }: Props) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <Field label="Area" value={customer.area ?? "—"} />
        <Field label="Phone" value={customer.phone ?? "—"} />
        <Field label="Referral" value={customer.referral ?? "—"} />
        <Field
          label="Credit limit"
          value={<Money paisas={customer.creditLimitPaisas} />}
        />
        <Field
          label="Outstanding"
          value={<Money paisas={customer.outstandingPaisas} />}
        />
        <Field
          label="Last payment"
          value={
            customer.lastPaymentDate
              ? `${fmtDate(customer.lastPaymentDate)} · `
              : "—"
          }
          trailing={
            customer.lastPaymentPaisas != null ? (
              <Money paisas={customer.lastPaymentPaisas} />
            ) : null
          }
        />
        <Field
          label="Default payment type"
          value={
            customer.paymentType[0].toUpperCase() +
            customer.paymentType.slice(1)
          }
        />
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  trailing,
}: {
  label: string;
  value: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">
        {value}
        {trailing}
      </div>
    </div>
  );
}
