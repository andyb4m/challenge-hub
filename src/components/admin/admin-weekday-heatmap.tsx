import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminWeekdayHeatmap({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most active day</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_LABELS.map((label, i) => {
            const intensity = counts[i] / max;
            return (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="flex h-16 w-full items-end rounded-md bg-primary/10 p-1">
                  <div
                    className="w-full rounded-sm bg-primary"
                    style={{
                      height: counts[i] > 0 ? `${Math.max(intensity * 100, 10)}%` : "0%",
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted">{label}</span>
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {counts[i]}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
