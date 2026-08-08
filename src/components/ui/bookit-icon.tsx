import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The supplied Bookit SVG icon set, inlined.
 *
 * The source files live in `public/assets/icons` and the geometry here is
 * copied from them verbatim. Inlining keeps `currentColor` inheritance and
 * avoids a network request per icon; Lucide is used only where the Bookit set
 * has no equivalent.
 */

const PATHS = {
  bell: <path d="M6 17h12l-2-3v-4a4 4 0 0 0-8 0v4l-2 3zM10 20h4" />,
  booking: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 9h16M9 14l2 2 4-4" />
    </>
  ),
  comedy: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 10h.01M15.5 10h.01M8 14c1.2 1.4 2.5 2 4 2s2.8-.6 4-2" />
    </>
  ),
  community: (
    <>
      <circle cx="8" cy="9" r="2" />
      <circle cx="16" cy="9" r="2" />
      <circle cx="12" cy="15" r="2" />
      <path d="M9.5 10.5l1.5 3M14.5 10.5l-1.5 3M10 15h4" />
    </>
  ),
  concerts: <path d="M8 4v10.5a3.5 3.5 0 1 1-2-3.16V6l10-2v8.5a3.5 3.5 0 1 1-2-3.16V4.4L8 5.6" />,
  conference: (
    <>
      <circle cx="8" cy="8" r="2" />
      <circle cx="16" cy="8" r="2" />
      <path d="M4 18v-2a4 4 0 0 1 4-4M20 18v-2a4 4 0 0 0-4-4M10 18h4" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  gift: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M12 8v12M4 12h16M12 8c-1.8-3.8-6-3.4-6-1 0 1.5 1.5 2 3 2h3zM12 8c1.8-3.8 6-3.4 6-1 0 1.5-1.5 2-3 2h-3z" />
    </>
  ),
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />,
  meeting: <path d="M5 18v-5h14v5M8 13V8h8v5M12 4v4" />,
  party: <path d="M4 20l4-12 8 8-12 4zM13 5l1-2M17 7l3-1M16 11l3 2" />,
  qr: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2v2h-2zM18 14h2v6h-2zM14 18h3v2h-3z" />,
  rsvp: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 10h8M8 14h5M15 17l1.5 1.5L20 15" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </>
  ),
  seat: <path d="M6 12h12v6H6zM8 6h8v6H8zM5 18v2M19 18v2" />,
  sports: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4l2.5 4.5L20 10l-3.5 4 1 5-5.5-2.3L6.5 19l1-5L4 10l5.5-1.5L12 4z" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V7z" />
      <path d="M12 7v12" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c.8-4 3.3-6 7-6s6.2 2 7 6" />
    </>
  ),
  venue: (
    <>
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  wedding: (
    <>
      <circle cx="9" cy="12" r="4" />
      <circle cx="15" cy="12" r="4" />
    </>
  ),
} satisfies Record<string, React.ReactNode>;

export type BookitIconName = keyof typeof PATHS;

export interface BookitIconProps extends React.SVGAttributes<SVGSVGElement> {
  name: BookitIconName;
  /** Accessible label. Omit for purely decorative icons. */
  title?: string;
}

export function BookitIcon({ name, title, className, ...props }: BookitIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
