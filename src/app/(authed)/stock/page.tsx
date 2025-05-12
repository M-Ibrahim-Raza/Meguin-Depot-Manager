import { StockTable } from "@/features/stock/components/stock-table";
import { auth } from "@/server/auth";
import { exportColumnMeta } from "@/server/export/datasets";
import { api } from "@/trpc/server";

export default async function StockPage() {
  const [rows, session] = await Promise.all([api.stock.list(), auth()]);
  const canManage = session?.user?.role === "admin";
  return (
    <StockTable
      initialRows={rows}
      canManage={canManage}
      exportColumns={canManage ? exportColumnMeta.stock : undefined}
    />
  );
}
