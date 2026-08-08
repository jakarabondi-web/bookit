import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "brand";
}

export function MetricCard({ label, value, hint, icon, tone = "default" }: MetricCardProps) {
  return (
    <Card className={cn(tone === "brand" && "border-primary/20 bg-primary-tint/40")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
        </div>
        <p className="mt-2 text-2xl font-bold leading-none text-ink">{value}</p>
        {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
