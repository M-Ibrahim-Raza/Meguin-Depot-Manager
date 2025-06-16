import { notFound } from "next/navigation";
import { BillForm } from "@/features/bills/components/bill-form";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";

type Params = { id: string };

export default async function NewBillPage({
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

  const [products, preview, stock, session] = await Promise.all([
    api.products.list(),
    api.bills.nextNoPreview(),
    api.stock.list(),
    auth(),
  ]);

  return (
    <BillForm
      customer={customer}
      products={products}
      nextBillNoPreview={preview}
      initialStock={stock}
      canOverride={session?.user?.role === "admin"}
    />
  );
}
