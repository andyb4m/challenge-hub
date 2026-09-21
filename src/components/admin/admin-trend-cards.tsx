import type { AdminTrend } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function TrendCard({ label, trend }: { label: string; trend: AdminTrend }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <p className="text-sm text-muted">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {trend.current}
          </p>
          {trend.deltaPct !== null && (
            <span
              className={cn(
                "text-xs font-semibold",
                trend.deltaPct >= 0 ? "text-success" : "text-error"
              )}
            >
              {trend.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(trend.deltaPct)}%
            </span>
          )}
        </div>
        <p className="text-xs text-faint">vs. {trend.previous} the week before</p>
      </CardContent>
    </Card>
  );
}

export function AdminTrendCards({
  newUsersTrend,
  activitiesTrend,
}: {
  newUsersTrend: AdminTrend;
  activitiesTrend: AdminTrend;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TrendCard label="New users (7d)" trend={newUsersTrend} />
      <TrendCard label="Activities (7d)" trend={activitiesTrend} />
    </div>
  );
}
