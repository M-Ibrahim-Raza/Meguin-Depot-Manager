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
import { Textarea } from "@/components/ui/textarea";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from "@/lib/constants";
import { today as todayStr } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import type { Customer } from "@/server/db/schema";
import { trpc } from "@/trpc/react";
import { recordPaymentSchema, type RecordPaymentInput } from "../schemas";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, customer is pre-selected and locked. */
  defaultCustomer?: Customer;
  /** Required when defaultCustomer is not set. */
  customers?: Customer[];
};

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultCustomer,
  customers,
}: Props) {
  const router = useRouter();
  const recordMutation = trpc.payments.record.useMutation({
    onSuccess: (data) => {
      toast.success(`Payment ${data.payId} recorded · pending approval`);
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const isPending = recordMutation.isPending;
  const customerLocked = !!defaultCustomer;

  const form = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema as never),
    defaultValues: {
      customerId: defaultCustomer?.id ?? 0,
      date: todayStr(),
      amountRupees: 0,
      method: "cash",
      note: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        customerId: defaultCustomer?.id ?? 0,
        date: todayStr(),
        amountRupees: 0,
        method: "cash",
        note: "",
      });
    }
  }, [open, defaultCustomer, form]);

  function onSubmit(values: RecordPaymentInput) {
    recordMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {customerLocked
              ? `Logged against ${defaultCustomer?.name}. Awaits admin approval.`
              : "Awaits admin approval before it affects the customer balance."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {!customerLocked ? (
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => field.onChange(v ? Number(v) : 0)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pick a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(customers ?? []).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) =>
                        field.onChange((v ?? "cash") as PaymentMethod)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {PAYMENT_METHOD_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amountRupees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (Rs.)</FormLabel>
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="e.g. Cheque #4421"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isPending ? "Recording…" : "Record payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
