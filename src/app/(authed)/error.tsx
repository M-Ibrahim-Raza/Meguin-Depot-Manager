"use client";

import { CircleAlert, RefreshCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AuthedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Authed route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-12 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <CircleAlert className="size-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Something Went Wrong</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {error.message || "An unexpected error occurred."}
          {error.digest ? (
            <span className="text-muted-foreground/70 mt-1 block text-xs">
              Ref: {error.digest}
            </span>
          ) : null}
        </p>
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        <RefreshCcw className="size-4" />
        Try Again
      </Button>
    </div>
  );
}
