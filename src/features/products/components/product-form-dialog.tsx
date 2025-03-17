"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  FormDescription,
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paisasToRupees } from "@/lib/format";
import { getErrorMessage } from "@/lib/trpc-error";
import type { Product } from "@/server/db/schema";
import { trpc } from "@/trpc/react";
import { createProductSchema, type CreateProductInput } from "../schemas";
import { CategoryManagerDialog } from "./category-manager-dialog";

/** Sentinel value for the "manage categories" item inside the category select. */
const MANAGE_CATEGORIES = "__manage__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in "edit" mode. */
  product?: Product;
  /** Whether the current user (admin) may add/remove categories. */
  canManage?: boolean;
};

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  canManage = false,
}: Props) {
  const editing = !!product;
  const router = useRouter();
  const [manageOpen, setManageOpen] = useState(false);
  // Set when the user picks the "Add category" item; the manager opens once the
  // select finishes closing (see onOpenChangeComplete).
  const wantManageRef = useRef(false);

  const { data: categories = [] } = trpc.categories.list.useQuery();

  const onSuccess = () => {
    toast.success(editing ? "Product updated" : "Product added");
    onOpenChange(false);
    router.refresh();
  };
  const onError = (error: Parameters<typeof getErrorMessage>[0]) =>
    toast.error(getErrorMessage(error));

  const createMutation = trpc.products.create.useMutation({
    onSuccess,
    onError,
  });
  const updateMutation = trpc.products.update.useMutation({
    onSuccess,
    onError,
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema as never),
    defaultValues: {
      articleNumber: "",
      name: "",
      unit: "",
      category: "",
      priceRupees: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        product
          ? {
              articleNumber: product.articleNumber,
              name: product.name,
              unit: product.unit,
              category: product.category,
              priceRupees: paisasToRupees(product.pricePaisas),
            }
          : {
              articleNumber: "",
              name: "",
              unit: "",
              category: "",
              priceRupees: 0,
            },
      );
    }
  }, [open, product, form]);

  function onSubmit(values: CreateProductInput) {
    if (product) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update product details. Past bills keep their original prices."
              : "Add a new product to the catalogue."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="articleNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Article Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="MEG-20W50-208"
                      disabled={editing}
                      {...field}
                    />
                  </FormControl>
                  {!editing ? (
                    <FormDescription>
                      Can&apos;t be changed after the product is created.
                    </FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Meguin 20W50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="Drum (208L)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value === MANAGE_CATEGORIES) {
                          // Defer opening the manager until the select has fully
                          // closed, so its closing click doesn't dismiss the
                          // newly-opened dialog.
                          wantManageRef.current = true;
                          return;
                        }
                        field.onChange(value);
                      }}
                      onOpenChangeComplete={(isOpen) => {
                        if (!isOpen && wantManageRef.current) {
                          wantManageRef.current = false;
                          setManageOpen(true);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                        {canManage ? (
                          <>
                            <SelectSeparator />
                            <SelectItem value={MANAGE_CATEGORIES}>
                              ＋ Add Category
                            </SelectItem>
                          </>
                        ) : null}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="priceRupees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Per Unit (Rs.)</FormLabel>
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
                  ? "Saving…"
                  : editing
                    ? "Save Changes"
                    : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      {canManage ? (
        <CategoryManagerDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          onCreated={(name) =>
            form.setValue("category", name, { shouldValidate: true })
          }
        />
      ) : null}
    </Dialog>
  );
}
