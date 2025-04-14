import { CreditBar } from "@/components/credit-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer } from "@/server/db/schema";

type Props = {
  customer: Customer;
  pendingPaisas: bigint;
};

export function CreditSummaryCard({ customer, pendingPaisas }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Credit Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <CreditBar
          outstandingPaisas={customer.outstandingPaisas}
          creditLimitPaisas={customer.creditLimitPaisas}
          pendingPaisas={pendingPaisas > 0n ? pendingPaisas : undefined}
        />
      </CardContent>
    </Card>
  );
}
