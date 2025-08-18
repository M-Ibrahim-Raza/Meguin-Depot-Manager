"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, PackageOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CreditBar } from "@/components/credit-bar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductPicker, type PickerProduct } from "@/components/product-picker";
import { today as todayStr } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import type { ReturnableProduct } from "@/server/db/repos/returns.repo";
import type { Customer } from "@/server/db/schema";
import { trpc } from "@/trpc/react";
import { calculateReturnTotal } from "../lib";
import { createReturnSchema, type CreateReturnInput } from "../schemas";
import { ReturnItemsList } from "./return-items-list";
import { ReturnTotalsFooter } from "./return-totals-footer";

type Props = {
  customer: Customer;
  returnableProducts: ReturnableProduct[];
  nextReturnNoPreview: string;
  /** Whether the current user is an admin — an admin's return settles
   * immediately; anyone else's is submitted for admin approval. */
  isAdmin: boolean;
};

export function ReturnBillForm({
  customer,
  returnableProducts,
  nextReturnNoPreview,
  isAdmin,
}: Props) {
  const router = useRouter();
  const createMutation = trpc.returns.create.useMutation({
    onSuccess: (data) => {
      const message = isAdmin
        ? `Return bill ${data.billNo} created`
        : `Return bill ${data.billNo} submitted for admin approval`;
      toast.success(message);
      router.push(`/customers/${customer.id}/bills/${data.billId}/print`);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const isPending = createMutation.isPending;

  const returnableByArticle = useMemo(
    () => new Map(returnableProducts.map((r) => [r.articleNumber, r])),
    [returnableProducts],
  );

  // Reuse the sale picker/line-rows: price = latest sale price, the stock
  // "available" slot carries the returnable quantity (the cap).
  const pickerProducts = useMemo<PickerProduct[]>(
    () =>
      returnableProducts.map((r) => ({
        articleNumber: r.articleNumber,
        name: r.name,
        unit: r.unit,
        category: r.category,
        pricePaisas: r.latestUnitPricePaisas,
      })),
    [returnableProducts],
  );
  const returnableQtyByArticle = useMemo(
    () =>
      new Map(
        returnableProducts.map((r) => [r.articleNumber, r.returnableQty]),
      ),
    [returnableProducts],
  );

  const form = useForm<CreateReturnInput>({
    resolver: zodResolver(createReturnSchema as never),
    defaultValues: {
      customerId: customer.id,
      date: todayStr(),
      note: "",
      items: [],
    },
  });

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");

  const pickedQty = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items) map[it.articleNumber] = it.qty;
    return map;
  }, [items]);

  const totalPaisas = useMemo(
    () => calculateReturnTotal(items, returnableByArticle),
    [items, returnableByArticle],
  );

  const projectedOutstanding = customer.outstandingPaisas - totalPaisas;
  const createsCredit = projectedOutstanding < 0n;

  const overReturn = useMemo(
    () =>
      items
        .map((it) => {
          const r = returnableByArticle.get(it.articleNumber);
          return {
            articleNumber: it.articleNumber,
            name: r?.name ?? it.articleNumber,
            unit: r?.unit ?? "",
            qty: it.qty,
            returnable: r?.returnableQty ?? 0,
          };
        })
        .filter((x) => x.qty > x.returnable),
    [items, returnableByArticle],
  );
  const blocked = overReturn.length > 0;

  function handlePick(product: PickerProduct) {
    const cap = returnableQtyByArticle.get(product.articleNumber) ?? 0;
    const idx = fields.findIndex(
      (f) => f.articleNumber === product.articleNumber,
    );
    if (idx >= 0) {
      const current = items[idx]?.qty ?? fields[idx].qty;
      update(idx, {
        articleNumber: product.articleNumber,
        qty: Math.min(cap, +(current + 1).toFixed(3)),
      });
    } else {
      append({ articleNumber: product.articleNumber, qty: Math.min(cap, 1) });
    }
  }

  function handleQtyChange(idx: number, qty: number) {
    if (qty <= 0) {
      remove(idx);
    } else {
      update(idx, { articleNumber: fields[idx].articleNumber, qty });
    }
  }

  function onSubmit(values: CreateReturnInput) {
    if (blocked) {
      toast.error("Some lines exceed the returnable quantity.");
      return;
    }
    createMutation.mutate(values);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div>
        <Link
          href={`/customers/${customer.id}`}
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "mb-2 -ml-2",
          })}
        >
          <ArrowLeft className="size-4" />
          Back to {customer.name}
        </Link>
        <h1 className="text-2xl font-semibold">New Return Bill</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {customer.name} · next return #{nextReturnNoPreview}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Credit</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditBar
            outstandingPaisas={customer.outstandingPaisas}
            creditLimitPaisas={customer.creditLimitPaisas}
          />
        </CardContent>
      </Card>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
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
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={1}
                        placeholder="e.g. Damaged on delivery"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Pick Products to Return
                </CardTitle>
              </CardHeader>
              <CardContent>
                {returnableProducts.length === 0 ? (
                  <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm">
                    <PackageOpen className="size-8" />
                    This customer has no products available to return.
                  </div>
                ) : (
                  <ProductPicker
                    products={pickerProducts}
                    pickedQty={pickedQty}
                    availableByArticle={returnableQtyByArticle}
                    onPick={handlePick}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Return items</span>
                  <Badge variant="secondary">
                    {fields.length} {fields.length === 1 ? "line" : "lines"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-sm">
                    <PackageOpen className="size-8" />
                    Pick a product to add a return line.
                  </div>
                ) : (
                  <ReturnItemsList
                    fields={fields}
                    items={items}
                    returnableByArticle={returnableByArticle}
                    onQtyChange={handleQtyChange}
                    onRemove={remove}
                  />
                )}
                {form.formState.errors.items?.message ? (
                  <p className="text-destructive mt-3 text-sm">
                    {form.formState.errors.items.message as string}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <ReturnTotalsFooter
            totalPaisas={totalPaisas}
            projectedOutstanding={projectedOutstanding}
            createsCredit={createsCredit}
            blocked={blocked}
            overReturn={overReturn}
            isPending={isPending}
            lineCount={fields.length}
            nextReturnNoPreview={nextReturnNoPreview}
            isAdmin={isAdmin}
          />
        </form>
      </Form>
    </div>
  );
}
