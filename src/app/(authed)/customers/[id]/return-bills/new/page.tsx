import { notFound } from "next/navigation";
import { ReturnBillForm } from "@/features/returns/components/return-bill-form";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";

type Params = { id: string };

export default async function NewReturnBillPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isFinite(customerId) || customerId <= 0) {
    notFound();
  }

  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const customer = await api.customers
    .byId({ id: customerId })
    .catch(() => null);
  if (!customer) {
    notFound();
  }

  const [returnableProducts, nextReturnNoPreview] = await Promise.all([
    api.returns.returnableProducts({ customerId }),
    api.returns.nextNoPreview(),
  ]);

  return (
    <ReturnBillForm
      customer={customer}
      returnableProducts={returnableProducts}
      nextReturnNoPreview={nextReturnNoPreview}
      isAdmin={isAdmin}
    />
  );
}
