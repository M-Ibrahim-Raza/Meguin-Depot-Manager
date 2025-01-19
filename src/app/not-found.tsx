import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-12 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <CircleHelp className="size-6" />
      </div>
      <div>
        <h1 className="text-lg font-semibold">Page Not Found</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
        Back to Dashboard
      </Link>
    </div>
  );
}
