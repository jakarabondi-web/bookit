import Link from "next/link";
import { cn } from "@/lib/utils";

/** The lowercase `bookit` wordmark, with the dot in brand orange. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-baseline text-2xl font-bold tracking-tight text-ink",
        className,
      )}
      aria-label="Bookit — home"
    >
      <span>bookit</span>
      <span className="ml-0.5 size-1.5 rounded-full bg-primary" aria-hidden="true" />
    </Link>
  );
}
