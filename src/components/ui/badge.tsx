import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-secondary text-ink-secondary",
        brand: "border-primary/20 bg-primary-tint text-primary-hover",
        success: "border-success/20 bg-success-tint text-success",
        error: "border-error/20 bg-error-tint text-error",
        info: "border-info/20 bg-info-tint text-info",
        warning: "border-warning/20 bg-warning-tint text-warning",
        solid: "border-transparent bg-ink text-white",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
