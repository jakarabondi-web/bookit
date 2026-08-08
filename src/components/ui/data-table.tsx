import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Responsive data table.
 *
 * On desktop this renders a real `<table>` with proper header semantics. Below
 * `md` the same rows render as stacked cards — the pattern the spec asks for —
 * with each cell labelled by its column heading so the information stays
 * readable and announced correctly.
 */

export interface Column<T> {
  key: string;
  header: string;
  /** Cell content. */
  render: (row: T) => React.ReactNode;
  /** Hidden on the mobile card layout when the value is redundant. */
  hideOnMobile?: boolean;
  className?: string;
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  emptyState?: React.ReactNode;
  /** Rendered as the card title on mobile. */
  mobileTitle: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  emptyState,
  mobileTitle,
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop: real table semantics. */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface md:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-line bg-surface-secondary/60">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-line last:border-0 hover:bg-surface-secondary/50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-3 py-3 align-middle text-ink-secondary",
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: the same rows as labelled cards. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-card border border-line bg-surface p-4 shadow-card"
          >
            <div className="mb-3 text-sm font-semibold text-ink">{mobileTitle(row)}</div>
            <dl className="flex flex-col gap-2">
              {columns
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div key={column.key} className="flex items-start justify-between gap-4">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      {column.header}
                    </dt>
                    <dd className="text-right text-sm text-ink-secondary">{column.render(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
