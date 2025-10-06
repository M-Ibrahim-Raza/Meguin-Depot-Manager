"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import type { BusinessInfo } from "@/lib/constants";
import type { StockTransfer, StockTransferItem } from "@/server/db/schema";
import { TransferSlip } from "./transfer-slip";

type Props = {
  transfer: StockTransfer;
  items: StockTransferItem[];
  createdByName: string | null;
  business: BusinessInfo;
};

const COPIES = ["Dispatch Copy", "Receiving Copy"] as const;

export function TransferPrintSheet({
  transfer,
  items,
  createdByName,
  business,
}: Props) {
  return (
    <div className="bg-muted/30 min-h-screen print:bg-white">
      <div className="mx-auto flex max-w-198.5 items-center justify-between gap-3 px-4 py-3 print:hidden">
        <Link
          href="/stock/transfers"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2",
          })}
        >
          <ArrowLeft className="size-4" />
          Back to transfers
        </Link>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print
        </Button>
      </div>

      <div className="mx-auto max-w-198.5 bg-white p-4 print:max-w-none print:p-0">
        <div className="flex flex-col text-black">
          {COPIES.map((title, i) => (
            <TransferSlip
              key={title}
              title={title}
              transfer={transfer}
              items={items}
              createdByName={createdByName}
              business={business}
              divider={i < COPIES.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
