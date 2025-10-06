"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { type PickerProduct } from "@/components/product-picker";
import {
  otherLocation,
  validateTransferInput,
} from "@/features/stock-transfers/lib";
import { type StockLocation } from "@/lib/constants";
import { today as todayStr } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import type { StockListRow } from "@/server/db/repos/stock.repo";
import type { Product } from "@/server/db/schema";
import { trpc } from "@/trpc/react";
import { createTransferSchema, type CreateTransferInput } from "../schemas";
import { TransferDetailsCard } from "./transfer-details-card";
import { TransferItemsCard } from "./transfer-items-card";
import { TransferPickCard } from "./transfer-pick-card";
import { TransferSummary } from "./transfer-summary";

type Props = {
  products: Product[];
  initialStock: StockListRow[];
  nextSlipNoPreview: string;
  /** Optional prefill (e.g. reversing an existing transfer). */
  initialValues?: {
    fromLocation: StockLocation;
    toLocation: StockLocation;
    items: { articleNumber: string; qty: number }[];
  };
};

/** Maps an input-validation failure to the same message the form already shows. */
const VALIDATION_MESSAGES: Record<string, string> = {
  "same-location": "Source and destination must be different",
  empty: "Add at least one product",
  "non-positive-qty": "Add at least one product",
  "duplicate-line": "Add at least one product",
};

export function TransferForm({
  products,
  initialStock,
  nextSlipNoPreview,
  initialValues,
}: Props) {
  const router = useRouter();

  const createMutation = trpc.stockTransfers.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Transfer ${data.slipNo} recorded`);
      router.push(`/stock/transfers/${data.transferId}/print`);
      router.refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
  const isPending = createMutation.isPending;

  const { data: stockRows = initialStock } = trpc.stock.list.useQuery(
    undefined,
    { initialData: initialStock },
  );
  const productByArticle = useMemo(
    () => new Map(products.map((p) => [p.articleNumber, p])),
    [products],
  );

  const form = useForm<CreateTransferInput>({
    resolver: zodResolver(createTransferSchema as never),
    defaultValues: {
      fromLocation: initialValues?.fromLocation ?? "warehouse",
      toLocation: initialValues?.toLocation ?? "office",
      date: todayStr(),
      note: "",
      items: initialValues?.items ?? [],
    },
  });

  const { fields, append, update, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const fromLocation = form.watch("fromLocation");
  const toLocation = form.watch("toLocation");

  // Available at the SOURCE location, per article.
  const availableByArticle = useMemo(
    () =>
      new Map(
        stockRows.map((s) => [
          s.articleNumber,
          fromLocation === "warehouse" ? s.warehouseQty : s.officeQty,
        ]),
      ),
    [stockRows, fromLocation],
  );

  const pickedQty = useMemo(() => {
    const map: Record<string, number> = {};
    for (const it of items) map[it.articleNumber] = it.qty;
    return map;
  }, [items]);

  const stockIssues = useMemo(
    () =>
      items
        .map((it) => {
          const product = productByArticle.get(it.articleNumber);
          return {
            articleNumber: it.articleNumber,
            name: product?.name ?? it.articleNumber,
            unit: product?.unit ?? "",
            qty: it.qty,
            available: availableByArticle.get(it.articleNumber) ?? 0,
          };
        })
        .filter((x) => x.qty > x.available),
    [items, availableByArticle, productByArticle],
  );
  const hasStockIssue = stockIssues.length > 0;

  function setDirection(from: StockLocation) {
    form.setValue("fromLocation", from);
    form.setValue("toLocation", otherLocation(from));
  }

  function handlePick(product: PickerProduct) {
    const idx = items.findIndex(
      (it) => it.articleNumber === product.articleNumber,
    );
    if (idx >= 0) {
      update(idx, { ...items[idx], qty: +(items[idx].qty + 1).toFixed(3) });
    } else {
      append({ articleNumber: product.articleNumber, qty: 1 });
    }
  }

  function handleQtyChange(idx: number, qty: number) {
    if (qty <= 0) remove(idx);
    else update(idx, { ...items[idx], qty });
  }

  function onSubmit(values: CreateTransferInput) {
    // Input-level rules (direction, non-empty, positive + unique lines) live in
    // the shared validator so the form and the tRPC boundary agree.
    const inputCheck = validateTransferInput({
      from: values.fromLocation,
      to: values.toLocation,
      lines: values.items,
    });
    if (!inputCheck.ok) {
      toast.error(VALIDATION_MESSAGES[inputCheck.error]);
      return;
    }
    // Source-stock sufficiency needs live ledger data, so it stays here.
    if (hasStockIssue) {
      toast.error("Some items exceed available stock at the source location.");
      return;
    }
    createMutation.mutate(values);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div>
        <Link
          href="/stock/transfers"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "mb-2 -ml-2",
          })}
        >
          <ArrowLeft className="size-4" />
          Back to transfers
        </Link>
        <h1 className="text-2xl font-semibold">New Transfer</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Next slip #{nextSlipNoPreview}
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <TransferDetailsCard
            control={form.control}
            fromLocation={fromLocation}
            toLocation={toLocation}
            onSelectDirection={setDirection}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TransferPickCard
              products={products}
              pickedQty={pickedQty}
              availableByArticle={availableByArticle}
              fromLocation={fromLocation}
              onPick={handlePick}
            />

            <TransferItemsCard
              fields={fields}
              items={items}
              productByArticle={productByArticle}
              availableByArticle={availableByArticle}
              fromLocation={fromLocation}
              itemsError={
                form.formState.errors.items?.message as string | undefined
              }
              onQtyChange={handleQtyChange}
              onRemove={remove}
            />
          </div>

          <TransferSummary
            fromLocation={fromLocation}
            toLocation={toLocation}
            stockIssues={stockIssues}
            hasStockIssue={hasStockIssue}
            lineCount={fields.length}
            isPending={isPending}
            nextSlipNoPreview={nextSlipNoPreview}
          />
        </form>
      </Form>
    </div>
  );
}
