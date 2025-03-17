"use client";

import { Package, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/trpc-error";
import type { Product } from "@/server/db/schema";
import { trpc } from "@/trpc/react";
import { categoryOptions, filterProducts } from "../lib";
import { ProductCard } from "./product-card";
import { ProductFormDialog } from "./product-form-dialog";

type Props = {
  products: Product[];
  canCreate?: boolean;
  canEdit?: boolean;
  canManageCategories?: boolean;
};

export function ProductsGrid({
  products,
  canCreate = false,
  canEdit = false,
  canManageCategories,
}: Props) {
  const [filter, setFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | undefined>(undefined);
  const router = useRouter();
  const deleteMutation = trpc.products.delete.useMutation();
  const isPending = deleteMutation.isPending;

  const filters = useMemo(() => categoryOptions(products), [products]);

  const visible = useMemo(
    () => filterProducts(products, { search, category: filter }),
    [products, filter, search],
  );

  const isSearching = search.trim().length > 0;

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    deleteMutation.mutate(
      { articleNumber: target.articleNumber },
      {
        onSuccess: () => {
          toast.success(`Deleted ${target.name}`);
          router.refresh();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
        onSettled: () => setDeleting(undefined),
      },
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {visible.length === products.length
              ? `${products.length} product${products.length === 1 ? "" : "s"}`
              : `Showing ${visible.length} of ${products.length} products`}
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Product
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setSearch("")}
          placeholder="Search by name, article number, or category…"
          aria-label="Search products"
          className="pr-8 pl-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Package className="size-8" />
          <p className="text-sm">
            {products.length === 0
              ? "No products yet. Add one to get started."
              : isSearching
                ? "No products match your search."
                : "No products in this category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProductCard
              key={p.articleNumber}
              product={p}
              canEdit={canEdit}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        canManage={canManageCategories}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The product is removed from the catalogue. Past bills keep their
              line items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
