"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StockSortDir, StockSortKey } from "@/features/stock/lib";
import { cn } from "@/lib/utils";

type Props = {
  sort: { key: StockSortKey; dir: StockSortDir };
  toggleSort: (key: StockSortKey) => void;
};

export function StockTableHeader({ sort, toggleSort }: Props) {
  return (
    <TableHeader>
      <TableRow>
        <SortHeader
          label="Product"
          active={sort.key === "name"}
          dir={sort.dir}
          onClick={() => toggleSort("name")}
        />
        <TableHead>Category</TableHead>
        <TableHead className="text-right">Warehouse</TableHead>
        <TableHead className="text-right">Office</TableHead>
        <SortHeader
          label="Total"
          className="text-right"
          active={sort.key === "quantityOnHand"}
          dir={sort.dir}
          onClick={() => toggleSort("quantityOnHand")}
        />
        <TableHead className="text-right">Reorder</TableHead>
        <SortHeader
          label="Status"
          active={sort.key === "status"}
          dir={sort.dir}
          onClick={() => toggleSort("status")}
        />
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  dir: StockSortDir;
  onClick: () => void;
  className?: string;
}) {
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1",
          className?.includes("text-right") && "flex-row-reverse",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  );
}
