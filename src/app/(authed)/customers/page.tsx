import { CustomerList } from "@/features/customers/components/customer-list";
import { auth } from "@/server/auth";
import { exportColumnMeta } from "@/server/export/datasets";
import { api } from "@/trpc/server";

export default async function CustomersPage() {
  const [customers, session] = await Promise.all([
    api.customers.list(),
    auth(),
  ]);

  const canCreate = !!session?.user;
  const isAdmin = session?.user?.role === "admin";

  // Pending bill counts per customer (one aggregated query).
  const pendingByCustomer = new Map<number, number>();
  const pendingBillRows = await api.bills.pendingCountByCustomer();
  for (const row of pendingBillRows) {
    pendingByCustomer.set(row.customerId, row.count);
  }

  // Pending payment counts per customer (admin only — one aggregated query).
  const pendingPaymentsByCustomer = new Map<number, number>();
  if (isAdmin) {
    const rows = await api.payments.pendingCountByCustomer();
    for (const row of rows) {
      pendingPaymentsByCustomer.set(row.customerId, row.count);
    }
  }

  // Pending return-bill counts per customer (admin only — one aggregated query).
  const pendingReturnBillsByCustomer = new Map<number, number>();
  if (isAdmin) {
    const rows = await api.returns.pendingCountByCustomer();
    for (const row of rows) {
      pendingReturnBillsByCustomer.set(row.customerId, row.count);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {customers.length} customer{customers.length === 1 ? "" : "s"}
        </p>
      </div>
      <CustomerList
        customers={customers}
        canCreate={canCreate}
        isAdmin={isAdmin}
        pendingByCustomer={pendingByCustomer}
        pendingPaymentsByCustomer={pendingPaymentsByCustomer}
        pendingReturnByCustomer={pendingReturnBillsByCustomer}
        exportColumns={exportColumnMeta.customers}
      />
    </div>
  );
}
