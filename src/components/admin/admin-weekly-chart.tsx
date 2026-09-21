import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Hand-rolled SVG, no charting dependency — matches ProgressChart's approach.
const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 12, bottom: 28, left: 28 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;
const Y_TICKS = 3;
const FILL_COLOR = "#8b5cf6"; // primary.light — brand gradient's accent stop

export function AdminWeeklyChart({
  data,
}: {
  data: { weekStart: string; count: number }[];
}) {
  const maxY = Math.max(1, ...data.map((d) => d.count));
  const x = (i: number) => PADDING.left + (i / (data.length - 1)) * PLOT_WIDTH;
  const y = (value: number) => PADDING.top + PLOT_HEIGHT - (value / maxY) * PLOT_HEIGHT;

  const linePoints = data.map((d, i) => `${x(i)},${y(d.count)}`).join(" ");
  const areaPoints = `${x(0)},${y(0)} ${linePoints} ${x(data.length - 1)},${y(0)}`;

  const yTickValues = Array.from({ length: Y_TICKS + 1 }, (_, i) =>
    Math.round((maxY / Y_TICKS) * i)
  );

  // Subsample x-axis labels so 8 weeks of "MM-DD" text doesn't overlap.
  const xLabelCount = Math.min(data.length, 4);
  const xLabelIndices = Array.from({ length: xLabelCount }, (_, i) =>
    Math.round((i / Math.max(xLabelCount - 1, 1)) * (data.length - 1))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity, last 8 weeks</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Activities logged per week, over the last 8 weeks"
        >
          <defs>
            <linearGradient id="adminWeeklyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={FILL_COLOR} stopOpacity="0.45" />
              <stop offset="100%" stopColor={FILL_COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTickValues.map((value) => (
            <g key={value}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y(value)}
                y2={y(value)}
                stroke="#334155"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 6}
                y={y(value)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="#94a3b8"
              >
                {value}
              </text>
            </g>
          ))}

          {xLabelIndices.map((i) => (
            <text
              key={data[i].weekStart}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {data[i].weekStart.slice(5)}
            </text>
          ))}

          <polygon points={areaPoints} fill="url(#adminWeeklyFill)" />
          <polyline
            points={linePoints}
            fill="none"
            stroke={FILL_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </CardContent>
    </Card>
  );
}
