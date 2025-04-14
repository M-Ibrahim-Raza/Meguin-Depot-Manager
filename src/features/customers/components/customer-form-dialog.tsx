"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AmountInput } from "@/components/ui/amount-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILL_TYPES } from "@/lib/constants";
import { paisasToRupees } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import type { Customer } from "@/server/db/schema";
import { trpc } from "@/trpc/react";
import {
  createCustomerSchema,
  type CreateCustomerInput,
  type CustomerPaymentType,
} from "../schemas";

const PAYMENT_TYPE_LABELS: Record<CustomerPaymentType, string> = {
  cash: "Cash",
  deferred: "Deferred",
  mixed: "Mixed",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
};

const CREATE_DEFAULTS: CreateCustomerInput = {
  name: "",
  area: "",
  phone: "",
  referral: "",
  creditLimitRupees: 0,
  paymentType: "deferred",
  initialOutstandingRupees: 0,
};

function customerToDefaults(c: Customer): CreateCustomerInput {
  return {
    name: c.name,
    area: c.area ?? "",
    phone: c.phone ?? "",
    referral: c.referral ?? "",
    creditLimitRupees: paisasToRupees(c.creditLimitPaisas),
    paymentType: c.paymentType as CustomerPaymentType,
    // Not shown/editable outside creation — inert placeholder to satisfy the type.
    initialOutstandingRupees: 0,
  };
}

export function CustomerFormDialog({ open, onOpenChange, customer }: Props) {
  const editing = !!customer;
  const router = useRouter();

  const onSuccess = () => {
    toast.success(editing ? "Customer updated" : "Customer added");
    onOpenChange(false);
    router.refresh();
  };
  const onError = (error: Parameters<typeof getErrorMessage>[0]) =>
    toast.error(getErrorMessage(error));

  const createMutation = trpc.customers.create.useMutation({
    onSuccess,
    onError,
  });
  const updateMutation = trpc.customers.update.useMutation({
    onSuccess,
    onError,
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema as never),
    defaultValues: customer ? customerToDefaults(customer) : CREATE_DEFAULTS,
  });
  const creditLimitRupees = form.watch("creditLimitRupees");

  useEffect(() => {
    if (open) {
      form.reset(customer ? customerToDefaults(customer) : CREATE_DEFAULTS);
    }
  }, [open, customer, form]);

  function onSubmit(values: CreateCustomerInput) {
    if (customer) {
      updateMutation.mutate({ ...values, id: customer.id });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Customer" : "Add Customer"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update customer details. Outstanding balance is managed by bills and payments."
              : "Create a new customer record. Optionally set an initial outstanding balance for a customer migrated from your previous system."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ali Traders" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Saddar" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="03xx-xxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referral"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Who referred this customer?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="creditLimitRupees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit limit (Rs.)</FormLabel>
                    <FormControl>
                      <AmountInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) =>
                        field.onChange((v ?? "deferred") as CustomerPaymentType)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BILL_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {PAYMENT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!editing && (
              <FormField
                control={form.control}
                name="initialOutstandingRupees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial outstanding (Rs.) — optional</FormLabel>
                    <FormControl>
                      <AmountInput
                        value={field.value}
                        onChange={field.onChange}
                        max={creditLimitRupees}
                      />
                    </FormControl>
                    <p className="text-muted-foreground text-sm">
                      For a customer migrated from your previous system. Leave
                      blank to start at zero. Cannot exceed the credit limit.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? editing
                    ? "Saving…"
                    : "Adding…"
                  : editing
                    ? "Save Changes"
                    : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
