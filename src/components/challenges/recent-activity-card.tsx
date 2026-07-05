import type { RecentActivity } from "@/lib/challenges/service";
import { Card, CardContent } from "@/components/ui/card";

export function RecentActivityCard({
  activities,
}: {
  activities: RecentActivity[];
}) {
  return (
    <Card>
      <CardContent className="p-6">
        {activities.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-line/60 pb-3 text-sm last:border-b-0 last:pb-0"
              >
                <span className="truncate font-medium text-foreground">
                  {activity.name}
                  {activity.source === "strava" && (
                    <span className="ml-1.5 rounded-full bg-[#FC4C02]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FC4C02]">
                      Strava
                    </span>
                  )}
                </span>
                <span className="whitespace-nowrap text-xs text-muted">
                  {activity.startDate.slice(0, 10)} in {activity.challengeName}
                </span>
              </li>
            ))}
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
