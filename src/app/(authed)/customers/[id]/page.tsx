import { notFound } from "next/navigation";
import { CustomerDetail } from "@/features/customers/components/customer-detail";
import { auth } from "@/server/auth";
import { exportColumnMeta } from "@/server/export/datasets";
import { api } from "@/trpc/server";

type Params = { id: string };

export default async function CustomerPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isFinite(customerId) || customerId <= 0) {
    notFound();
  }

  const customer = await api.customers
    .byId({ id: customerId })
    .catch(() => null);
  if (!customer) {
    notFound();
  }

  const [bills, returnBills, payments, reversals, session] = await Promise.all([
    api.customers.bills({ customerId }),
    api.customers.returnBills({ customerId }),
    api.customers.payments({ customerId }),
    api.paymentReversals.listByCustomer({ customerId }),
    auth(),
  ]);

  const isAdmin = session?.user?.role === "admin";

  return (
    <CustomerDetail
      customer={customer}
      bills={bills}
      returnBills={returnBills}
      payments={payments}
      reversals={reversals}
      canEdit={isAdmin}
      canManageApprovals={isAdmin}
      billExportColumns={isAdmin ? exportColumnMeta.bills : undefined}
      paymentExportColumns={isAdmin ? exportColumnMeta.payments : undefined}
      ledgerExportColumns={isAdmin ? exportColumnMeta.ledger : undefined}
    />
  );
}
