import { TransferForm } from "@/features/stock-transfers/components/transfer-form";
import type { StockLocation } from "@/lib/constants";
import { api } from "@/trpc/server";

type SearchParams = { reverse?: string };

export default async function NewTransferPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { reverse } = await searchParams;

  const [products, stock, preview] = await Promise.all([
    api.products.list(),
    api.stock.list(),
    api.stockTransfers.nextNoPreview(),
  ]);

  // "Reverse this transfer": prefill the opposite direction + same items.
  let initialValues:
    | {
        fromLocation: StockLocation;
        toLocation: StockLocation;
        items: { articleNumber: string; qty: number }[];
      }
    | undefined;
  const reverseId = reverse ? Number(reverse) : NaN;
  if (Number.isFinite(reverseId) && reverseId > 0) {
    const source = await api.stockTransfers
      .byId({ id: reverseId })
      .catch(() => null);
    if (source) {
      initialValues = {
        fromLocation: source.transfer.toLocation as StockLocation,
        toLocation: source.transfer.fromLocation as StockLocation,
        items: source.items.map((it) => ({
          articleNumber: it.articleNumber,
          qty: Number(it.qty),
        })),
      };
    }
  }

  return (
    <TransferForm
      products={products}
      initialStock={stock}
      nextSlipNoPreview={preview}
      initialValues={initialValues}
    />
  );
}
