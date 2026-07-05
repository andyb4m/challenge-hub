import type { User } from "@/types";
import type { RecentActivity } from "@/lib/challenges/service";
import { Card } from "@/components/ui/card";

export function HubHeader({
  profile,
  activeChallengeCount,
  totalChallengeCount,
  totalActivities,
  recentActivities,
}: {
  profile: Pick<User, "displayName" | "photoURL">;
  activeChallengeCount: number;
  totalChallengeCount: number;
  totalActivities: number;
  recentActivities: RecentActivity[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          {profile.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-line text-lg font-medium text-muted">
              {profile.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <p className="truncate font-semibold text-foreground">
            {profile.displayName}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Active" value={activeChallengeCount} />
          <Stat label="Challenges" value={totalChallengeCount} />
          <Stat label="Activities" value={totalActivities} />
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Recent activity
          </p>
          {recentActivities.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {recentActivities.map((activity) => (
                <li
                  key={activity.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
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
            <p className="mt-1 text-sm text-muted">
              No activity logged yet — get moving!
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-foreground sm:text-xl">{value}</p>
      <p className="whitespace-nowrap text-xs text-muted">{label}</p>
    </div>
  );
}
