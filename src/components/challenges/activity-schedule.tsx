import type { RecentActivity } from "@/lib/challenges/service";
import { groupActivitiesByDate, localToday } from "@/lib/challenges/scoring";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Parsed as UTC (matching the app-wide convention of slicing startDate's
// date portion directly, see groupActivitiesByDate) to avoid a local-
// timezone day shift.
function weekdayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function dayNumber(date: string): string {
  return String(Number(date.slice(8, 10)));
}

function StravaBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-[#FC4C02]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FC4C02]">
      Strava
    </span>
  );
}

export function ActivitySchedule({
  activities,
}: {
  activities: RecentActivity[];
}) {
  const groups = groupActivitiesByDate(activities);
  const today = localToday();

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted">No activity logged yet — get moving!</p>
    );
  }

  return (
    <div className="flex flex-col">
      {groups.map((group) => {
        const isToday = group.date === today;
        return (
          <div
            key={group.date}
            className="flex gap-4 border-b border-line/40 py-4 first:pt-0 last:border-b-0 last:pb-0"
          >
            <div className="flex w-11 shrink-0 flex-col items-center gap-0.5 pt-0.5">
              <span className="text-xs uppercase text-muted">
                {isToday ? "Today" : weekdayLabel(group.date)}
              </span>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                  isToday ? "bg-primary text-white" : "text-foreground"
                )}
              >
                {dayNumber(group.date)}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {group.activities.map((activity) => (
                <div
                  key={activity.id}
                  className={cn(
                    "min-w-0 rounded-lg border-l-4 bg-card py-2 pl-3 pr-3",
                    activity.source === "strava"
                      ? "border-l-[#FC4C02]"
                      : "border-l-primary"
                  )}
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {activity.name}
                    {activity.source === "strava" && <StravaBadge />}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {activity.challengeName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
