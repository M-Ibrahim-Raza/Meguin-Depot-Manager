"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fmtQty } from "@/features/stock/lib";
import { nonNegativeQty, positiveQty } from "@/lib/validators";
import {
  STOCK_LOCATIONS,
  STOCK_LOCATION_LABELS,
  type StockLocation,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/trpc-error";
import { trpc } from "@/trpc/react";

export type MovementMode = "opening" | "add" | "adjust";

type Target = {
  articleNumber: string;
  name: string;
  unit: string;
  warehouseQty: number;
  officeQty: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: MovementMode;
  target: Target;
  /** Location the dialog opens on (defaults to warehouse). */
  initialLocation?: StockLocation;
};

const MODE_UI: Record<
  MovementMode,
  { title: string; description: string; label: string; cta: string }
> = {
  opening: {
    title: "Set opening stock",
    description: "Set the one-time baseline quantity for this location.",
    label: "Opening quantity",
    cta: "Set opening",
  },
  add: {
    title: "Add stock",
    description: "Record arriving goods or a restock at a location.",
    label: "Quantity to add",
    cta: "Add stock",
  },
  adjust: {
    title: "Adjust stock",
    description: "Correct a location's on-hand to a physically counted value.",
    label: "Counted quantity",
    cta: "Save adjustment",
  },
};

export function StockMovementDialog({
  open,
  onOpenChange,
  mode,
  target,
  initialLocation = "warehouse",
}: Props) {
  const ui = MODE_UI[mode];
  const utils = trpc.useUtils();

  const schema = z.object({
    location: z.enum(STOCK_LOCATIONS),
    value: mode === "add" ? positiveQty : nonNegativeQty,
    note:
      mode === "adjust"
        ? z.string().trim().min(1, "A reason is required").max(200)
        : z.string().trim().max(200).optional(),
  });
  type Values = z.infer<typeof schema>;

  const qtyAt = (location: StockLocation) =>
    location === "warehouse" ? target.warehouseQty : target.officeQty;

  const form = useForm<Values>({
    resolver: zodResolver(schema as never),
    defaultValues: { location: initialLocation, value: 0, note: "" },
  });

  const location = form.watch("location");
  const currentQty = qtyAt(location);

  // Prefill: adjust starts from the selected location's on-hand; others 0/blank.
  useEffect(() => {
    if (open) {
      form.reset({
        location: initialLocation,
        value: mode === "adjust" ? qtyAt(initialLocation) : 0,
        note: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialLocation]);

  const onSuccess = () => {
    toast.success(
      mode === "opening"
        ? "Opening stock set"
        : mode === "add"
          ? "Stock added"
          : "Stock adjusted",
    );
    void utils.stock.invalidate();
    onOpenChange(false);
  };
  const onError = (error: Parameters<typeof getErrorMessage>[0]) =>
    toast.error(getErrorMessage(error));

  const setOpening = trpc.stock.setOpening.useMutation({ onSuccess, onError });
  const add = trpc.stock.add.useMutation({ onSuccess, onError });
  const adjust = trpc.stock.adjust.useMutation({ onSuccess, onError });
  const isPending = setOpening.isPending || add.isPending || adjust.isPending;

  function onSubmit(values: Values) {
    if (mode === "opening") {
      setOpening.mutate({
        articleNumber: target.articleNumber,
        location: values.location,
        qty: values.value,
      });
    } else if (mode === "add") {
      add.mutate({
        articleNumber: target.articleNumber,
        location: values.location,
        qty: values.value,
        note: values.note?.trim() ? values.note.trim() : undefined,
      });
    } else {
      adjust.mutate({
        articleNumber: target.articleNumber,
        location: values.location,
        counted: values.value,
        note: (values.note ?? "").trim(),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{ui.title}</DialogTitle>
          <DialogDescription>
            {target.name} · Warehouse {fmtQty(target.warehouseQty)} · Office{" "}
            {fmtQty(target.officeQty)} {target.unit}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <div className="grid grid-cols-2 gap-1.5">
                    {STOCK_LOCATIONS.map((loc) => (
                      <button
                        type="button"
                        key={loc}
                        onClick={() => {
                          field.onChange(loc);
                          // Re-anchor the adjust baseline to the picked location.
                          if (mode === "adjust")
                            form.setValue("value", qtyAt(loc));
                        }}
                        className={cn(
                          "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                          field.value === loc
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-muted",
                        )}
                      >
                        {STOCK_LOCATION_LABELS[loc]}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {ui.label} ({target.unit}) ·{" "}
                    {STOCK_LOCATION_LABELS[location]} has {fmtQty(currentQty)}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.001"
                      min={0}
                      autoFocus
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
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
                  <FormLabel>
                    {mode === "adjust" ? "Reason" : "Note (optional)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder={
                        mode === "adjust"
                          ? "e.g. Damaged in transit, recount"
                          : "e.g. Delivery from supplier"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : ui.cta}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
