import { notFound } from "next/navigation";
import { TransferPrintSheet } from "@/features/stock-transfers/components/transfer-print-sheet";
import { BUSINESS_INFO } from "@/lib/constants";
import { api } from "@/trpc/server";

type Params = { id: string };

export default async function TransferPrintPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    notFound();
  }

  const data = await api.stockTransfers.byId({ id: idNum }).catch(() => null);
  if (!data) {
    notFound();
  }

  return (
    <TransferPrintSheet
      transfer={data.transfer}
      items={data.items}
      createdByName={data.createdByName}
      business={BUSINESS_INFO}
    />
  );
}
