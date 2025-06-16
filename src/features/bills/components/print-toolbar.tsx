"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

type Props = {
  customerId: number;
  disabled?: boolean;
};

export function PrintToolbar({ customerId, disabled }: Props) {
  return (
    <div className="mx-auto flex max-w-198.5 items-center justify-between gap-3 px-4 py-3 print:hidden">
      <Link
        href={`/customers/${customerId}`}
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "-ml-2",
        })}
      >
        <ArrowLeft className="size-4" />
        Back to customer
      </Link>
      <Button type="button" disabled={disabled} onClick={() => window.print()}>
        <Printer className="size-4" />
        Print
      </Button>
    </div>
  );
}
