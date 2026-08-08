import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/** Loading, empty and error states, used consistently across every route. */

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} aria-hidden="true" {...props} />;
}

export function EventCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[4/3] w-full rounded-card" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function CardGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
      role="status"
      aria-label="Loading events"
    >
      {Array.from({ length: count }, (_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-dashed border-line bg-surface-secondary/50 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-primary-tint text-primary">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action ? (
        <Button asChild size="sm" className="mt-2">
          <a href={action.href}>{action.label}</a>
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card border border-error/20 bg-error-tint px-6 py-10 text-center"
    >
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-md text-sm text-ink-secondary">{description}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      ) : null}
    </div>
  );
}
