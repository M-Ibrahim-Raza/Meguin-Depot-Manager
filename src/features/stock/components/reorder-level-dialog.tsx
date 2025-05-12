"use client";

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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { fmtQty } from "@/features/stock/lib";
import { getErrorMessage } from "@/lib/trpc-error";
import { trpc } from "@/trpc/react";

type Target = {
  articleNumber: string;
  name: string;
  unit: string;
  reorderLevel: number | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
};

export function ReorderLevelDialog({ open, onOpenChange, target }: Props) {
  const utils = trpc.useUtils();
  const form = useForm<{ level: string }>({ defaultValues: { level: "" } });

  useEffect(() => {
    if (open) {
      form.reset({
        level: target.reorderLevel == null ? "" : fmtQty(target.reorderLevel),
      });
    }
  }, [open, target.reorderLevel, form]);

  const mutation = trpc.stock.setReorderLevel.useMutation({
    onSuccess: () => {
      toast.success("Reorder level updated");
      void utils.stock.invalidate();
      onOpenChange(false);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function onSubmit({ level }: { level: string }) {
    const trimmed = level.trim();
    const reorderLevel = trimmed === "" ? null : Number(trimmed);
    if (
      reorderLevel != null &&
      (!Number.isFinite(reorderLevel) || reorderLevel < 0)
    ) {
      toast.error("Enter a valid quantity, or leave blank to clear");
      return;
    }
    mutation.mutate({ articleNumber: target.articleNumber, reorderLevel });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reorder level</DialogTitle>
          <DialogDescription>
            {target.name} · alert when on-hand drops to this level. Leave blank
            to disable.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder level ({target.unit})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.001"
                      min={0}
                      autoFocus
                      placeholder="No alert"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
