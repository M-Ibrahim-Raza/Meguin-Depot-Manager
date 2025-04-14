import { CustomerLedger } from "@/features/ledger/components/customer-ledger";
import type { Bill, Payment, PaymentReversal } from "@/server/db/schema";
import type { ExportColumnMeta } from "@/server/export/types";

type Props = {
  bills: Bill[];
  returnBills: Bill[];
  payments: Payment[];
  reversals: PaymentReversal[];
  customerId: number;
  ledgerExportColumns?: ExportColumnMeta[];
};

export function LedgerPanel({
  bills,
  returnBills,
  payments,
  reversals,
  customerId,
  ledgerExportColumns,
}: Props) {
  return (
    <CustomerLedger
      bills={bills}
      returnBills={returnBills}
      payments={payments}
      reversals={reversals}
      customerId={customerId}
      ledgerExportColumns={ledgerExportColumns}
    />
  );
}
