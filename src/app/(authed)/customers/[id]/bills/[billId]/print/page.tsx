import { notFound } from "next/navigation";
import { BillPrintSheet } from "@/features/bills/components/bill-print-sheet";
import { BUSINESS_INFO } from "@/lib/constants";
import { api } from "@/trpc/server";

type Params = { id: string; billId: string };

export default async function BillPrintPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id, billId } = await params;
  const customerId = Number(id);
  const billIdNum = Number(billId);
  if (
    !Number.isFinite(customerId) ||
    customerId <= 0 ||
    !Number.isFinite(billIdNum) ||
    billIdNum <= 0
  ) {
    notFound();
  }

  const data = await api.bills
    .byId({ billId: billIdNum, customerId })
    .catch(() => null);
  if (!data) {
    notFound();
  }

  return (
    <BillPrintSheet
      bill={data.bill}
      customer={data.customer}
      items={data.items}
      business={BUSINESS_INFO}
    />
  );
}
