import { createSearchParamsCache, type SearchParams } from "nuqs/server";
import { MovementsFeed } from "@/features/stock/components/movements-feed";
import {
  buildMovementsQueryInput,
  movementsParsers,
} from "@/features/stock/components/movements-search-params";
import { auth } from "@/server/auth";
import { exportColumnMeta } from "@/server/export/datasets";
import { api } from "@/trpc/server";

// Parse the same URL filter the client reads, so the first page is prefetched
// on the server for whatever range/kind/location the link encodes.
const searchParamsCache = createSearchParamsCache(movementsParsers);

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [resolvedParams, session] = await Promise.all([searchParams, auth()]);
  const values = searchParamsCache.parse(resolvedParams);
  const isAdmin = session?.user?.role === "admin";
  const initialPage = await api.stock.movements(
    buildMovementsQueryInput(values),
  );
  return (
    <MovementsFeed
      initialPage={initialPage}
      exportColumns={isAdmin ? exportColumnMeta["stock-movements"] : undefined}
    />
  );
}
