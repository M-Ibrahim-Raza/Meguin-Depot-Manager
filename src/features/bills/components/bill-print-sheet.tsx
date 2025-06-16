"use client";

import { useState } from "react";
import type { BusinessInfo } from "@/lib/constants";
import type { Bill, BillItem, Customer } from "@/server/db/schema";
import { type BillCopyTitle, getBillCopyTitles } from "../lib";
import { BillCopy } from "./bill-copy";
import { PrintCopySelector } from "./print-copy-selector";
import { PrintToolbar } from "./print-toolbar";

type Props = {
  bill: Bill;
  customer: Customer;
  items: BillItem[];
  business: BusinessInfo;
};

export function BillPrintSheet({ bill, customer, items, business }: Props) {
  const isReturn = bill.direction === "return";
  const titles = getBillCopyTitles(bill.direction);
  const [selected, setSelected] = useState<Set<BillCopyTitle>>(
    () => new Set(titles),
  );
  const visible = titles.filter((title) => selected.has(title));

  function toggle(title: BillCopyTitle) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }

  return (
    <div className="bg-muted/30 min-h-screen print:bg-white">
      <PrintToolbar
        customerId={bill.customerId}
        disabled={selected.size === 0}
      />
      <PrintCopySelector
        titles={titles}
        selected={selected}
        onToggle={toggle}
      />

      <div className="mx-auto max-w-198.5 bg-white p-4 print:max-w-none print:p-0">
        <div className="flex flex-col text-black">
          {visible.map((title, i) => (
            <BillCopy
              key={title}
              title={title}
              isReturn={isReturn}
              bill={bill}
              customer={customer}
              items={items}
              business={business}
              grandTotalPaisas={bill.amountPaisas}
              divider={i < visible.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
