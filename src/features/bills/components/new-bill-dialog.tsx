"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Customer } from "@/server/db/schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
};

/**
 * The global Bills page has no customer in context, unlike a customer's own
 * detail page — so "New Bill" picks a customer first, then hands off to the
 * existing per-customer bill form rather than duplicating it.
 */
export function NewBillDialog({ open, onOpenChange, customers }: Props) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) setCustomerId("");
    onOpenChange(next);
  }

  function handleContinue() {
    if (!customerId) return;
    onOpenChange(false);
    router.push(`/customers/${customerId}/bills/new`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Bill</DialogTitle>
          <DialogDescription>
            Pick the customer to bill — you&apos;ll fill in the products on the
            next screen.
          </DialogDescription>
        </DialogHeader>

        <Select
          value={customerId}
          onValueChange={(v) => setCustomerId(v ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pick a customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleContinue} disabled={!customerId}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
