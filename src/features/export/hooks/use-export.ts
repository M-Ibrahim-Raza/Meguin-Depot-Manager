"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Filename from a `Content-Disposition: attachment; filename="…"` header. */
function filenameFromDisposition(disposition: string | null): string {
  const match = /filename="?([^"]+)"?/i.exec(disposition ?? "");
  return match?.[1] ?? "export";
}

/**
 * Fetches an export endpoint and triggers a browser download from the blob.
 * Surfaces progress/errors via toasts. Returns whether the download succeeded.
 */
export function useExport() {
  const [isPending, setIsPending] = useState(false);

  async function download(url: string): Promise<boolean> {
    setIsPending(true);
    const toastId = toast.loading("Preparing export…");
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(message || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const filename = filenameFromDisposition(
        res.headers.get("Content-Disposition"),
      );

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      toast.success("Export downloaded", { id: toastId });
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed", {
        id: toastId,
      });
      return false;
    } finally {
      setIsPending(false);
    }
  }

  return { isPending, download };
}
