import { PaymentsLedger } from "@/features/payments/components/payments-ledger";
import { auth } from "@/server/auth";
import { exportColumnMeta } from "@/server/export/datasets";
import { api } from "@/trpc/server";

export default async function PaymentsPage() {
  const [session, payments, customers, reversals] = await Promise.all([
    auth(),
    api.payments.list(),
    api.customers.list(),
    api.paymentReversals.listAll(),
  ]);

  const isAdmin = session?.user?.role === "admin";

  return (
    <PaymentsLedger
      payments={payments}
      customers={customers}
      reversals={reversals}
      isAdmin={isAdmin}
      exportColumns={exportColumnMeta.payments}
    />
  );
}
