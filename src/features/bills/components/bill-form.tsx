"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CreditBar } from "@/components/credit-bar";
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
import {
  calculateAvailableByLocation,
  validateStockAvailable,
} from "@/features/stock/lib";
import { type StockLocation } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { paisasToRupees, today as todayStr } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import type { StockListRow } from "@/server/db/repos/stock.repo";
import type { Customer, Product } from "@/server/db/schema";
import { trpc } from "@/trpc/react";
import {
  calculateBillTotal,
  calculateBillUpsellPaisas,
  computeBillStatus,
  validateUpsellPrices,
} from "../lib";
import { createBillSchema, type CreateBillInput } from "../schemas";
import { BillLineItems } from "./bill-line-items";
import { BillSummary } from "./bill-summary";
import { ProductPicker, type PickerProduct } from "@/components/product-picker";

type Props = {
  customer: Customer;
  products: Product[];
  nextBillNoPreview: string;
  initialStock: StockListRow[];
  /** Whether the current user (admin) may sell past available stock. */
  canOverride: boolean;
  /** Whether this customer already has a pending approval bill. */
  hasPendingBill?: boolean;
};

export function BillForm({
  customer,
  products,
  nextBillNoPreview,
  initialStock,
  canOverride,
  hasPendingBill,
}: Props) {
  const router = useRouter();
  const [override, setOverride] = useState(false);
  const createMutation = trpc.bills.create.useMutation({
    onSuccess: (data) => {
      const isPendingApproval = overLimit && !canOverride;
      const message = isPendingApproval
        ? `Bill ${data.billNo} submitted for admin approval`
        : `Bill ${data.billNo} created`;
      toast.success(message);
      router.push(`/customers/${customer.id}/bills/${data.billId}/print`);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const isPending = createMutation.isPending;

  // Live stock, seeded from the server snapshot so the first paint is instant.
  const { data: stockRows = initialStock } = trpc.stock.list.useQuery(
    undefined,
    { initialData: initialStock },
  );
  // Total per article (drives the picker's out-of-stock dimming).
  const availableByArticle = useMemo(
    () => new Map(stockRows.map((s) => [s.articleNumber, s.quantityOnHand])),
    [stockRows],
  );
  // Per-(article, location) available, for line-level checks.
  const availByKey = useMemo(
    () => calculateAvailableByLocation(stockRows),
    [stockRows],
  );
  // Per-article breakdown shown on each picker card.
  const locationAvailability = useMemo(
    () =>
      new Map(
        stockRows.map((s) => [
          s.articleNumber,
          { warehouse: s.warehouseQty, office: s.officeQty },
        ]),
      ),
    [stockRows],
  );

  const productByArticle = useMemo(
    () => new Map(products.map((p) => [p.articleNumber, p])),
    [products],
  );

  const form = useForm<CreateBillInput>({
    resolver: zodResolver(createBillSchema as never),
    defaultValues: {
      customerId: customer.id,
      date: todayStr(),
      type: "deferred",
      note: "",
      items: [],
    },
  });

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const type = form.watch("type");

  const pickedQty = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items)
      map[it.articleNumber] = (map[it.articleNumber] ?? 0) + it.qty;
    return map;
  }, [items]);

  const totalPaisas = useMemo(
    () => calculateBillTotal(items, productByArticle),
    [items, productByArticle],
  );

  const totalUpsellPaisas = useMemo(
    () => calculateBillUpsellPaisas(items, productByArticle),
    [items, productByArticle],
  );

  const upsellIssues = useMemo(
    () => validateUpsellPrices(items, productByArticle),
    [items, productByArticle],
  );

  const projectedOutstanding =
    type === "deferred"
      ? customer.outstandingPaisas + totalPaisas
      : customer.outstandingPaisas;
  const { overLimit } = computeBillStatus({
    type,
    totalPaisas,
    outstandingPaisas: customer.outstandingPaisas,
    creditLimitPaisas: customer.creditLimitPaisas,
    isAdmin: canOverride,
  });

  const stockIssues = useMemo(
    () =>
      validateStockAvailable(items, availByKey).map((s) => {
        const product = productByArticle.get(s.articleNumber);
        return {
          articleNumber: s.articleNumber,
          location: s.location,
          name: product?.name ?? s.articleNumber,
          unit: product?.unit ?? "",
          qty: s.requested,
          available: s.available,
        };
      }),
    [items, availByKey, productByArticle],
  );
  const hasStockIssue = stockIssues.length > 0;
  const blockedByStock = hasStockIssue && !(canOverride && override);
  const blockedByUpsell = upsellIssues.length > 0;

  function handlePick(product: PickerProduct) {
    // Default to the warehouse if it has stock, otherwise the office.
    const warehouse =
      availByKey.get(`${product.articleNumber}::warehouse`) ?? 0;
    const location: StockLocation = warehouse > 0 ? "warehouse" : "office";
    const idx = items.findIndex(
      (it) =>
        it.articleNumber === product.articleNumber && it.location === location,
    );
    if (idx >= 0) {
      update(idx, { ...items[idx], qty: +(items[idx].qty + 1).toFixed(3) });
    } else {
      append({
        articleNumber: product.articleNumber,
        location,
        qty: 1,
        salePriceRupees: 0,
      });
    }
  }

  function handleQtyChange(idx: number, qty: number) {
    if (qty <= 0) {
      remove(idx);
    } else {
      update(idx, { ...items[idx], qty });
    }
  }

  // Floor-clamp to the product's catalogue price (an upsell can only raise
  // the price), and normalize back to the `0` "no override" sentinel when the
  // entered price lands exactly on the catalogue price.
  function handleSalePriceChange(idx: number, rupees: number) {
    const line = items[idx];
    const product = productByArticle.get(line?.articleNumber ?? "");
    if (!line || !product) return;
    const floorRupees = paisasToRupees(product.pricePaisas);
    const clamped = Math.max(rupees, floorRupees);
    // `setValue`, not the field array's `update` — `update` unmounts and
    // remounts the row (a fresh field id), which would reset the row's local
    // "editing" state and steal focus from the price input on every keystroke.
    form.setValue(
      `items.${idx}.salePriceRupees`,
      clamped === floorRupees ? 0 : clamped,
    );
  }

  // Switch a line's source location. If the same product already has a line at
  // the target location, merge into it (keeps one line per article+location).
  function handleLocationChange(idx: number, location: StockLocation) {
    const line = items[idx];
    if (!line || line.location === location) return;
    const dupIdx = items.findIndex(
      (it, i) =>
        i !== idx &&
        it.articleNumber === line.articleNumber &&
        it.location === location,
    );
    if (dupIdx >= 0) {
      update(dupIdx, {
        ...items[dupIdx],
        qty: +(items[dupIdx].qty + line.qty).toFixed(3),
      });
      remove(idx);
    } else {
      update(idx, { ...line, location });
    }
  }

  function onSubmit(values: CreateBillInput) {
    if (blockedByStock) {
      toast.error("Some items exceed available stock. Reduce quantities.");
      return;
    }
    if (blockedByUpsell) {
      toast.error("Some prices are below the listed price. Fix them first.");
      return;
    }
    createMutation.mutate({ ...values, override: canOverride && override });
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
        <h1 className="text-2xl font-semibold">New Bill</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {customer.name} · next bill #{nextBillNoPreview}
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
            <CardContent className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["cash", "deferred"] as const).map((opt) => (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => field.onChange(opt)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors",
                            field.value === opt
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background hover:bg-muted",
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
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
                        placeholder="e.g. Delivered to depot 2"
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
                <CardTitle className="text-base">Pick Products</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductPicker
                  products={products}
                  pickedQty={pickedQty}
                  availableByArticle={availableByArticle}
                  locationAvailability={locationAvailability}
                  onPick={handlePick}
                />
              </CardContent>
            </Card>

            <BillLineItems
              fields={fields}
              items={items}
              productByArticle={productByArticle}
              availByKey={availByKey}
              itemsError={form.formState.errors.items?.message as string}
              onQtyChange={handleQtyChange}
              onLocationChange={handleLocationChange}
              onSalePriceChange={handleSalePriceChange}
              onRemove={remove}
            />
          </div>

          <BillSummary
            totalPaisas={totalPaisas}
            totalUpsellPaisas={totalUpsellPaisas}
            projectedOutstanding={projectedOutstanding}
            type={type}
            overLimit={overLimit}
            hasPendingBill={hasPendingBill}
            canOverride={canOverride}
            hasStockIssue={hasStockIssue}
            stockIssues={stockIssues}
            override={override}
            onOverrideChange={setOverride}
            isPending={isPending}
            lineCount={fields.length}
            blockedByStock={blockedByStock}
            blockedByUpsell={blockedByUpsell}
            nextBillNoPreview={nextBillNoPreview}
          />
        </form>
      </Form>
    </div>
  );
}
