import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookitIcon } from "@/components/ui/bookit-icon";

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary-tint text-primary">
        <BookitIcon name="search" className="size-6" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-ink lg:text-3xl">We could not find that page</h1>
      <p className="mt-3 max-w-md text-sm text-ink-secondary">
        The event may have finished, or the link may have changed. Try searching for it, or start
        from the homepage.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/events">Browse events</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
