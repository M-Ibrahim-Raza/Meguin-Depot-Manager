"use client";

import { Download } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { ExportDialog, type ExportDialogProps } from "./export-dialog";

type ExportButtonProps = Omit<ExportDialogProps, "open" | "onOpenChange"> & {
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
};

/** Opens the reusable export dialog. Render only for admin users. */
export function ExportButton({
  label = "Export",
  variant = "outline",
  size,
  className,
  ...dialogProps
}: ExportButtonProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Download className="size-4" />
        {label}
      </Button>
      {/* Remount on open so the dialog form re-initializes from current props. */}
      <ExportDialog
        key={open ? "open" : "closed"}
        open={open}
        onOpenChange={setOpen}
        {...dialogProps}
      />
    </>
  );
}
