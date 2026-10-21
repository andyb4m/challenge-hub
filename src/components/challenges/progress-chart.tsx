"use client";

import { useState } from "react";
import type { ZoneProgressChartData } from "@/lib/challenges/progress-chart";
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
const GRID_COLOR = "#334155";
const LABEL_COLOR = "#94a3b8";

const WIDTH = 640;
const HEIGHT = 280;
const PADDING = { top: 16, right: 16, bottom: 28, left: 32 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const Y_TICKS = 4;

/**
 * Hand-rolled SVG line chart — no charting dependency, matches the
 * project's low-dependency ethos and the tiny data volume at this scale.
 */
export function ProgressChart({ data }: { data: ZoneProgressChartData }) {
  const { dates, series } = data;
  const [hiddenUids, setHiddenUids] = useState<Set<string>>(new Set());

  function toggleUid(uid: string) {
    setHiddenUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  if (dates.length < 2) {
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
  const maxY = Math.max(1, ...scaleSeries.flatMap((s) => s.points));
  const x = (i: number) => PADDING.left + (i / (dates.length - 1)) * PLOT_WIDTH;
  const y = (value: number) => PADDING.top + PLOT_HEIGHT - (value / maxY) * PLOT_HEIGHT;

  const yTickValues = Array.from({ length: Y_TICKS + 1 }, (_, i) =>
    Math.round((maxY / Y_TICKS) * i)
  );

  const xLabelCount = Math.min(dates.length, 5);
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
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Cumulative points over time, one line per player"
        >
          {yTickValues.map((value) => (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
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
                fontSize={10}
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
              fontSize={10}
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
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )
          )}
        </svg>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {series.map((s, i) => {
            const hidden = hiddenUids.has(s.uid);
            return (
              <li key={s.uid}>
                <button
                  type="button"
                  onClick={() => toggleUid(s.uid)}
                  aria-pressed={!hidden}
                  className={cn(
                    "flex items-center gap-1.5 transition-opacity",
                    hidden ? "text-faint opacity-50" : "text-muted"
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
                  />
                  {s.displayName}
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
