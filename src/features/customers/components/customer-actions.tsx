"use client";

import { Minus, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { RecordPaymentDialog } from "@/features/payments/components/record-payment-dialog";
import type { Customer } from "@/server/db/schema";

type Props = { customer: Customer };

export function CustomerActions({ customer }: Props) {
  const [payOpen, setPayOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setPayOpen(true)}>
        <Wallet className="size-4" />
        Record Payment
      </Button>
      <Link
        href={`/customers/${customer.id}/return-bills/new`}
        className={buttonVariants({ variant: "destructive", size: "sm" })}
      >
        <Minus className="size-4" />
        New Return Bill
      </Link>
      <Link
        href={`/customers/${customer.id}/bills/new`}
        className={buttonVariants({ size: "sm" })}
      >
        <Plus className="size-4" />
        New Bill
      </Link>
      <RecordPaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        defaultCustomer={customer}
      />
    </div>
  );
}
