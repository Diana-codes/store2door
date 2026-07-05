import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "brand" | "accent";
}) {
  const tones = {
    default: "bg-card",
    positive: "bg-primary/5 border-primary/20",
    negative: "bg-destructive/5 border-destructive/20",
    brand: "bg-[var(--brand-green)]/5 border-[var(--brand-green)]/20",
    accent: "bg-[var(--brand-orange)]/5 border-[var(--brand-orange)]/20",
  } as const;

  const iconTones = {
    default: "text-muted-foreground bg-muted",
    positive: "text-primary bg-primary/10",
    negative: "text-destructive bg-destructive/10",
    brand: "text-[var(--brand-green)] bg-[var(--brand-green)]/10",
    accent: "text-[var(--brand-orange)] bg-[var(--brand-orange)]/10",
  } as const;

  return (
    <Card className={cn("border", tones[tone])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <div className={cn("rounded-md p-1.5", iconTones[tone])}>
              <Icon className="size-4" />
            </div>
          )}
        </div>
        <p className="mt-5 text-3xl font-bold tabular-nums tracking-tight truncate">
          {value}
        </p>
        {sub && (
          <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
