import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  /** Tailwind class for the value text colour. */
  tone?: string;
  Icon?: React.ComponentType<{ className?: string }>;
};

export function KpiCard({ label, value, sub, href, tone, Icon }: Props) {
  const body = (
    <CardContent className="flex h-full flex-col gap-1 p-5">
      <div className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-wide uppercase">
        <span className="flex items-center gap-1.5">
          {Icon ? <Icon className="size-3.5" /> : null}
          {label}
        </span>
        {href ? (
          <ArrowRight className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", tone)}>
        {value}
      </div>
      {sub ? <div className="text-muted-foreground text-xs">{sub}</div> : null}
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className="group block">
        <Card className="hover:border-primary/30 h-full transition-colors">
          {body}
        </Card>
      </Link>
    );
  }
  return <Card className="h-full">{body}</Card>;
}
