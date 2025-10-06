import { TransferList } from "@/features/stock-transfers/components/transfer-list";
import { api } from "@/trpc/server";

export default async function StockTransfersPage() {
  const transfers = await api.stockTransfers.list();
  return <TransferList initialRows={transfers} />;
}
