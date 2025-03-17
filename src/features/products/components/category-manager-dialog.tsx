"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/trpc-error";
import { trpc } from "@/trpc/react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new category name after a successful create. */
  onCreated?: (name: string) => void;
};

export function CategoryManagerDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const { data: categories = [] } = trpc.categories.list.useQuery();

  const createMutation = trpc.categories.create.useMutation({
    onSuccess: (created) => {
      toast.success("Category added");
      setName("");
      void utils.categories.list.invalidate();
      onCreated?.(created.name);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Category deleted");
      void utils.categories.list.invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const isPending = createMutation.isPending || deleteMutation.isPending;

  function addCategory() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate({ name: trimmed });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Add a new category or remove ones no longer in use.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory();
              }
            }}
            placeholder="New category name"
            aria-label="New category name"
          />
          <Button
            type="button"
            onClick={addCategory}
            disabled={isPending || !name.trim()}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No categories yet. Add one above.
            </p>
          ) : (
            categories.map((c) => (
              <div
                key={c.id}
                className="hover:bg-muted/50 flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
              >
                <span className="text-sm">{c.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${c.name}`}
                  disabled={isPending}
                  onClick={() => deleteMutation.mutate({ id: c.id })}
                >
                  <Trash2 className="text-muted-foreground size-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
