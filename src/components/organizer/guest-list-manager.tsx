"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BellRing,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  UserMinus,
} from "lucide-react";
import { BookingStatus } from "@/domain/enums";
import type { BanquetTable, Booking } from "@/domain/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/states";
import { pluralise } from "@/lib/format";

/**
 * Guest list manager.
 *
 * Filtering and search run client-side over the rows the server already sent —
 * a guest list is a few hundred rows at most, so a round trip per keystroke
 * would be slower and worse. Actions are optimistic against local state and
 * would post to `/api/v1/bookings/:id` in the wired build.
 */

const STATUS_TONE: Record<BookingStatus, "success" | "warning" | "info" | "error" | "neutral"> = {
  CONFIRMED: "success",
  CHECKED_IN: "success",
  PENDING: "warning",
  WAITLISTED: "info",
  DECLINED: "neutral",
  CANCELLED: "error",
  NO_SHOW: "neutral",
};

const ALL = "__all__";

export interface GuestListManagerProps {
  bookings: Booking[];
  tables: BanquetTable[];
  supportsTables: boolean;
  supportsContributions: boolean;
}

export function GuestListManager({
  bookings: initialBookings,
  tables,
  supportsTables,
  supportsContributions,
}: GuestListManagerProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookings.filter((booking) => {
      if (statusFilter !== ALL && booking.status !== statusFilter) return false;
      if (!term) return true;
      return [booking.primaryGuestName, booking.email, booking.phone, booking.reference]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [bookings, search, statusFilter]);

  const tableName = (tableId: string | null) =>
    tableId ? (tables.find((table) => table.id === tableId)?.name ?? "—") : "—";

  function updateStatus(bookingId: string, status: BookingStatus) {
    setBookings((current) =>
      current.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)),
    );
  }

  function toggleSelected(bookingId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  }

  /** Builds a CSV from the currently filtered rows and downloads it. */
  function exportCsv() {
    const headers = [
      "Reference",
      "Guest",
      "Phone",
      "Email",
      "Status",
      "Guests",
      "Table",
      "Meal",
      "Checked in",
    ];
    const rows = filtered.map((booking) => [
      booking.reference,
      booking.primaryGuestName,
      booking.phone ?? "",
      booking.email ?? "",
      booking.status,
      String(booking.guestCount),
      tableName(booking.tableId),
      booking.mealChoice ?? "",
      booking.checkedInAt ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bookit-guest-list.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<Booking>[] = [
    {
      key: "guest",
      header: "Guest",
      hideOnMobile: true,
      render: (booking) => (
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={selected.has(booking.id)}
            onChange={() => toggleSelected(booking.id)}
            aria-label={`Select ${booking.primaryGuestName}`}
            className="size-4 accent-[var(--color-primary)]"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{booking.primaryGuestName}</p>
            <p className="text-xs text-muted">{booking.reference}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (booking) => booking.phone ?? "—",
    },
    {
      key: "email",
      header: "Email",
      // Capped so the actions column still fits at 1280px without scrolling.
      render: (booking) => (
        <span className="block max-w-[10rem] truncate" title={booking.email ?? undefined}>
          {booking.email ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (booking) => (
        <Badge tone={STATUS_TONE[booking.status]}>
          {booking.status.replace("_", " ").toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "guests",
      header: "Guests",
      render: (booking) => booking.guestCount,
    },
    ...(supportsTables
      ? [
          {
            key: "table",
            header: "Table",
            render: (booking: Booking) => tableName(booking.tableId),
          },
        ]
      : []),
    ...(supportsContributions
      ? [
          {
            key: "payment",
            header: "Payment",
            render: (booking: Booking) => {
              if (!booking.contributionPledged) return "—";
              const paid = booking.contributionPaid?.amount ?? 0;
              const pledged = booking.contributionPledged.amount;
              return (
                <span
                  className={paid >= pledged ? "text-success" : "text-warning"}
                >
                  {Math.round((paid / pledged) * 100)}% paid
                </span>
              );
            },
          },
        ]
      : []),
    {
      key: "checkin",
      header: "In",
      render: (booking) =>
        booking.checkedInAt ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            In
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (booking) => (
        <div className="flex justify-end gap-1">
          {booking.status === BookingStatus.PENDING ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateStatus(booking.id, BookingStatus.CONFIRMED)}
            >
              Confirm
            </Button>
          ) : null}
          {booking.status === BookingStatus.WAITLISTED ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateStatus(booking.id, BookingStatus.CONFIRMED)}
            >
              Promote
            </Button>
          ) : null}
          {booking.status === BookingStatus.CONFIRMED ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateStatus(booking.id, BookingStatus.CHECKED_IN)}
              >
                Check In
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateStatus(booking.id, BookingStatus.WAITLISTED)}
              >
                <Clock className="size-3.5" />
              </Button>
            </>
          ) : null}
          {booking.status !== BookingStatus.CANCELLED ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-error hover:bg-error-tint"
              onClick={() => updateStatus(booking.id, BookingStatus.CANCELLED)}
              aria-label={`Cancel booking for ${booking.primaryGuestName}`}
            >
              <UserMinus className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <label htmlFor="guest-search" className="sr-only">
              Search guests
            </label>
            <Input
              id="guest-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone, email or reference"
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by status" className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.values(BookingStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace("_", " ").toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm">
            <Plus className="size-4" />
            Add Guest
          </Button>
          <Button size="sm" variant="secondary">
            <ArrowUpFromLine className="size-4" />
            Import CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            <ArrowDownToLine className="size-4" />
            Export CSV
          </Button>
          <Button size="sm" variant="secondary" disabled={selected.size === 0}>
            <BellRing className="size-4" />
            Send Reminder
            {selected.size > 0 ? ` (${selected.size})` : ""}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        Showing {pluralise(filtered.length, "guest")} of {bookings.length}
      </p>

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(booking) => booking.id}
        caption="Guest list"
        mobileTitle={(booking) => booking.primaryGuestName}
        emptyState={
          <EmptyState
            title="No guests match those filters"
            description="Try clearing the search or choosing a different status."
          />
        }
      />
    </div>
  );
}
