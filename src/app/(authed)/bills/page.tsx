import { BillsLedger } from "@/features/bills/components/bills-ledger";
import { auth } from "@/server/auth";
import { exportColumnMeta } from "@/server/export/datasets";
import { api } from "@/trpc/server";

export default async function BillsPage() {
  const [session, bills, customers] = await Promise.all([
    auth(),
    api.bills.list(),
    api.customers.list(),
  ]);

  const isAdmin = session?.user?.role === "admin";

  return (
    <BillsLedger
      bills={bills}
      customers={customers}
      isAdmin={isAdmin}
      exportColumns={exportColumnMeta.bills}
    />
  );
}
