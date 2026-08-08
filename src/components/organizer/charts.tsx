"use client";

import { useId, useState } from "react";

/**
 * Chart primitives for the organizer surfaces.
 *
 * Deliberate constraints: one series per chart, one hue per series (the brand
 * primary, read from the token so charts re-theme with the toggle), text in
 * ink tokens rather than series colour, a recessive grid, an emphasized final
 * point, and a hover layer — a chart without a tooltip is a picture.
 */

interface DayDatum {
  date: string;
  value: number;
  /** Preformatted value for the tooltip ("KES 48,200 · 41 tickets"). */
  label: string;
}

const DAY_FORMAT = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" });

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

/**
 * Daily bar chart with a per-bar hover tooltip. Bars are thin with a 2px
 * surface gap and 3px rounded data-ends; today's bar carries the full hue,
 * history sits slightly back.
 */
export function DailyBars({ data, ariaLabel }: { data: DayDatum[]; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();

  const width = 720;
  const height = 220;
  const padTop = 14;
  const padBottom = 26;
  const padLeft = 44;
  const plotWidth = width - padLeft - 8;
  const plotHeight = height - padTop - padBottom;
  const max = Math.max(...data.map((point) => point.value), 1);
  const step = plotWidth / data.length;
  const barWidth = Math.max(4, step - 2);

  // Three recessive gridlines at rounded fractions of the max.
  const gridValues = [max, max / 2];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {gridValues.map((value) => {
          const y = padTop + plotHeight - (value / max) * plotHeight;
          return (
            <g key={value}>
              <line
                x1={padLeft}
                x2={width - 8}
                y1={y}
                y2={y}
                stroke="var(--color-line)"
                strokeWidth="1"
              />
              <text
                x={padLeft - 6}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="var(--color-muted)"
                className="tabular"
              >
                {compact(value)}
              </text>
            </g>
          );
        })}
        <line
          x1={padLeft}
          x2={width - 8}
          y1={padTop + plotHeight}
          y2={padTop + plotHeight}
          stroke="var(--color-line-strong)"
          strokeWidth="1"
        />

        {data.map((point, index) => {
          const barHeight = Math.max(point.value > 0 ? 2 : 0, (point.value / max) * plotHeight);
          const x = padLeft + index * step + (step - barWidth) / 2;
          const y = padTop + plotHeight - barHeight;
          const isLast = index === data.length - 1;
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={Math.min(3, barWidth / 2)}
                fill={isLast ? "var(--color-primary)" : `url(#${gradientId})`}
                opacity={hover === null || hover === index ? 1 : 0.45}
              />
              {/* Hit target wider than the mark. */}
              <rect
                x={padLeft + index * step}
                y={padTop}
                width={step}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}

        {/* Sparse x-axis: first, every 7th, last. */}
        {data.map((point, index) =>
          index % 7 === 0 || index === data.length - 1 ? (
            <text
              key={`label-${point.date}`}
              x={padLeft + index * step + step / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-muted)"
            >
              {DAY_FORMAT.format(new Date(point.date))}
            </text>
          ) : null,
        )}
      </svg>

      {hover !== null && data[hover] ? (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-card-sm border border-line bg-surface px-2.5 py-1.5 text-xs shadow-raised"
          style={{ left: `${((padLeft + hover * step + step / 2) / width) * 100}%` }}
          role="status"
        >
          <span className="font-semibold text-ink">
            {DAY_FORMAT.format(new Date(data[hover].date))}
          </span>{" "}
          <span className="tabular text-ink-secondary">{data[hover].label}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Horizontal magnitude rows — one measure across entities, so one hue.
 * Values sit in ink, never in the bar colour.
 */
export function BreakdownBars({
  rows,
}: {
  rows: Array<{ label: string; value: number; display: string; hint?: string }>;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-sm text-ink">{row.label}</p>
            <p className="tabular shrink-0 text-sm font-semibold text-ink">
              {row.display}
              {row.hint ? <span className="ml-1.5 font-normal text-muted">{row.hint}</span> : null}
            </p>
          </div>
          <div
            className="mt-1.5 h-2 overflow-hidden rounded-pill bg-surface-secondary"
            role="img"
            aria-label={`${row.label}: ${row.display}`}
          >
            <div
              className="h-full rounded-pill bg-primary"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * One bar, many segments — share of a whole. Segments keep a 2px surface gap
 * and identity lives in the legend beneath, never in colour alone: each
 * legend row repeats the value.
 */
export function ShareBar({
  segments,
}: {
  segments: Array<{ label: string; value: number; display: string }>;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  // Single-hue opacity ramp: darkest = largest share. Adjacent steps differ
  // by ≥0.18 so they separate for every kind of colour vision.
  const opacities = [1, 0.72, 0.5, 0.32, 0.18];

  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-pill">
        {segments.map((segment, index) => (
          <div
            key={segment.label}
            className="h-full first:rounded-l-pill last:rounded-r-pill"
            style={{
              width: `${(segment.value / total) * 100}%`,
              backgroundColor: "var(--color-primary)",
              opacity: opacities[Math.min(index, opacities.length - 1)],
            }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {segments.map((segment, index) => (
          <li key={segment.label} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{
                backgroundColor: "var(--color-primary)",
                opacity: opacities[Math.min(index, opacities.length - 1)],
              }}
            />
            <span className="min-w-0 flex-1 truncate text-ink-secondary">{segment.label}</span>
            <span className="tabular font-medium text-ink">{segment.display}</span>
            <span className="tabular w-10 text-right text-xs text-muted">
              {Math.round((segment.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
