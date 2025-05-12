"use client";

import { useMemo, useState } from "react";
import {
  filterStockRows,
  sortStockRows,
  stockStatus,
  type StockSortDir,
  type StockSortKey,
} from "@/features/stock/lib";
import type { StockListRow } from "@/server/db/repos/stock.repo";

/**
 * Owns the stock table's filter/sort state and derives the category list,
 * the filtered+sorted visible rows, and the low/out count. Filtering and
 * sorting delegate to the DB-free `filterStockRows`/`sortStockRows` helpers so
 * the on-screen list applies the exact same predicates/comparators tested in
 * `lib.test.ts`.
 */
export function useStockTable(rows: StockListRow[]) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [lowOnly, setLowOnly] = useState(false);
  const [sort, setSort] = useState<{ key: StockSortKey; dir: StockSortDir }>({
    key: "name",
    dir: "asc",
  });

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((r) => r.category))).sort()],
    [rows],
  );

  const visible = useMemo(() => {
    const filtered = filterStockRows(rows, { search, category, lowOnly });
    return sortStockRows(filtered, sort.key, sort.dir);
  }, [rows, search, category, lowOnly, sort]);

  function toggleSort(key: StockSortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const lowCount = useMemo(
    () =>
      rows.filter((r) => stockStatus(r.quantityOnHand, r.reorderLevel) !== "ok")
        .length,
    [rows],
  );

  return {
    search,
    setSearch,
    category,
    setCategory,
    lowOnly,
    setLowOnly,
    sort,
    toggleSort,
    categories,
    visible,
    lowCount,
  };
}
