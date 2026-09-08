import type { RecentActivity } from "@/lib/challenges/service";
import { Card, CardContent } from "@/components/ui/card";

function StravaBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-[#FC4C02]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FC4C02]">
      Strava
    </span>
  );
}

export function RecentActivityCard({
  activities,
  variant = "compact",
}: {
  activities: RecentActivity[];
  /**
   * "compact" (default, used on the hub teaser): always a single row —
   * the name truncates with an ellipsis if it doesn't fit.
   * "detailed" (used on the full /activity page): always two rows —
   * name on its own line, then date + challenge below.
   */
  variant?: "compact" | "detailed";
}) {
  return (
    <Card>
      <CardContent className="p-6">
        {activities.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {activities.map((activity) =>
              variant === "detailed" ? (
                <li
                  key={activity.id}
                  className="flex flex-col gap-0.5 border-b border-line/60 pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <span className="truncate font-medium text-foreground">
                    {activity.name}
                    {activity.source === "strava" && <StravaBadge />}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {activity.startDate.slice(0, 10)} in{" "}
                    {activity.challengeName}
                  </span>
                </li>
              ) : (
                <li
                  key={activity.id}
                  className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    {activity.name}
                    {activity.source === "strava" && <StravaBadge />}
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-xs text-muted">
                    {activity.startDate.slice(0, 10)} in{" "}
                    {activity.challengeName}
                  </span>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No activity logged yet — get moving!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
