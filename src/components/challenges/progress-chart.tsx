"use client";

import { useEffect, useRef, useState } from "react";
import {
  niceYTicks,
  type ZoneProgressChartData,
} from "@/lib/challenges/progress-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Summer palette ported from the legacy Chart.js progress chart
// (docs/legacy-summerfit-handoff.md §3.4).
const SERIES_COLORS = [
  "#f97316",
  "#06b6d4",
  "#fbbf24",
  "#ec4899",
  "#10b981",
  "#8b5cf6",
  "#f43f5e",
  "#3b82f6",
];
// A second, non-color cue per line (WCAG 1.4.1): solid, dashed, dotted.
// Three patterns against eight colors means players sharing a color once
// there are more than eight (index i and i+8) still get different dashes.
const SERIES_DASHES = [undefined, "6 4", "1 4"];
const GRID_COLOR = "#334155";
const LABEL_COLOR = "#94a3b8";

// The viewBox width tracks the rendered width, so 1 SVG unit = 1 CSS px and
// labels render at LABEL_FONT_SIZE on every screen. A fixed 640-wide viewBox
// scaled down to a phone card shrank them to ~5px.
const DEFAULT_WIDTH = 640;
const HEIGHT = 280;
const PADDING = { top: 16, right: 16, bottom: 28, left: 36 };
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const Y_TICKS = 4;
const LABEL_FONT_SIZE = 11;
// Room each "MM-DD" x-axis label needs before the next one
const MIN_X_LABEL_SPACING = 64;

/**
 * Hand-rolled SVG line chart — no charting dependency, matches the
 * project's low-dependency ethos and the tiny data volume at this scale.
 */
export function ProgressChart({ data }: { data: ZoneProgressChartData }) {
  const { dates, series } = data;
  const [hiddenUids, setHiddenUids] = useState<Set<string>>(new Set());
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const svgRef = useRef<SVGSVGElement>(null);
  const hasChart = dates.length >= 2;

  // Re-attached when the chart first appears (the empty state renders no
  // svg to observe).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const measured = Math.round(entry.contentRect.width);
      if (measured > 0) setWidth(measured);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasChart]);

  function toggleUid(uid: string) {
    setHiddenUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  if (!hasChart) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress over time</CardTitle>
          <CardDescription>Cumulative points per player.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Log activity on a few different days to see the chart fill in.
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleSeries = series.filter((s) => !hiddenUids.has(s.uid));
  // Scale to whatever's actually shown; fall back to everyone if the user
  // has hidden every line, so the axes don't collapse to nothing.
  const scaleSeries = visibleSeries.length > 0 ? visibleSeries : series;
  const yTickValues = niceYTicks(
    Math.max(0, ...scaleSeries.flatMap((s) => s.points)),
    Y_TICKS
  );
  const maxY = yTickValues.at(-1) ?? 1;
  const plotWidth = width - PADDING.left - PADDING.right;
  const x = (i: number) => PADDING.left + (i / (dates.length - 1)) * plotWidth;
  const y = (value: number) => PADDING.top + PLOT_HEIGHT - (value / maxY) * PLOT_HEIGHT;


  const xLabelCount = Math.min(
    dates.length,
    5,
    Math.max(2, Math.floor(plotWidth / MIN_X_LABEL_SPACING))
  );
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / Math.max(xLabelCount - 1, 1)) * (dates.length - 1))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress over time</CardTitle>
        <CardDescription>Cumulative points per player.</CardDescription>
      </CardHeader>
      <CardContent>
        {visibleSeries.length === 0 && (
          <p className="mb-2 text-sm text-muted">
            All players are hidden — click a name below to show it again.
          </p>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Cumulative points over time, one line per player"
        >
          {yTickValues.map((value) => (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={y(value)}
                y2={y(value)}
                stroke={GRID_COLOR}
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 6}
                y={y(value)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={LABEL_FONT_SIZE}
                fill={LABEL_COLOR}
              >
                {value}
              </text>
            </g>
          ))}

          {xLabelIndices.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={LABEL_FONT_SIZE}
              fill={LABEL_COLOR}
            >
              {dates[i].slice(5)}
            </text>
          ))}

          {series.map((s, seriesIndex) =>
            hiddenUids.has(s.uid) ? null : (
              <polyline
                key={s.uid}
                points={s.points.map((p, i) => `${x(i)},${y(p)}`).join(" ")}
                fill="none"
                stroke={SERIES_COLORS[seriesIndex % SERIES_COLORS.length]}
                strokeDasharray={SERIES_DASHES[seriesIndex % SERIES_DASHES.length]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )
          )}
        </svg>

        {/* min-h-6 rows keep each toggle at the 24px target size (WCAG 2.5.8)
            even when names wrap onto several lines. The trailing total is
            the chart's data in text form. */}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {series.map((s, i) => {
            const hidden = hiddenUids.has(s.uid);
            return (
              <li key={s.uid}>
                <button
                  type="button"
                  onClick={() => toggleUid(s.uid)}
                  aria-pressed={!hidden}
                  className={cn(
                    "flex min-h-6 items-center gap-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    hidden ? "text-faint line-through" : "text-muted"
                  )}
                >
                  <svg
                    viewBox="0 0 16 8"
                    className={cn("h-2 w-4", hidden && "opacity-40")}
                    aria-hidden="true"
                  >
                    <line
                      x1={1}
                      x2={15}
                      y1={4}
                      y2={4}
                      stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                      strokeDasharray={SERIES_DASHES[i % SERIES_DASHES.length]}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </svg>
                  {s.displayName}
                  <span className="tabular-nums text-faint">
                    {(s.points.at(-1) ?? 0).toLocaleString()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
