"use client";

import { useRouter } from "next/navigation";
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
import { getErrorMessage } from "@/lib/trpc-error";
import type { User } from "@/server/db/schema";
import { trpc } from "@/trpc/react";

type Props = {
  user?: User;
  onOpenChange: (open: boolean) => void;
};

export function DeactivateAlertDialog({ user, onOpenChange }: Props) {
  const router = useRouter();
  const setActiveMutation = trpc.users.setActive.useMutation();
  const isPending = setActiveMutation.isPending;

  function confirm() {
    if (!user) return;
    const nextActive = !user.isActive;
    setActiveMutation.mutate(
      { id: user.id, isActive: nextActive },
      {
        onSuccess: () => {
          toast.success(nextActive ? "User reactivated" : "User deactivated");
          router.refresh();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
        onSettled: () => onOpenChange(false),
      },
    );
  }

  const deactivating = user?.isActive;

  return (
    <AlertDialog open={!!user} onOpenChange={(o) => !o && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? "Deactivate" : "Reactivate"} {user?.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? "They will no longer be able to log in. This can be reversed at any time."
              : "They will be able to log in again with their existing password."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={isPending}
            className={
              deactivating
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {isPending
              ? deactivating
                ? "Deactivating…"
                : "Reactivating…"
              : deactivating
                ? "Deactivate"
                : "Reactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
