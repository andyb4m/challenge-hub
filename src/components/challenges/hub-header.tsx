import type { User } from "@/types";
import type { RecentActivity } from "@/lib/challenges/service";
import { Card } from "@/components/ui/card";

export function HubHeader({
  profile,
  activeChallengeCount,
  totalActivities,
  lastActivity,
}: {
  profile: Pick<User, "displayName" | "photoURL">;
  activeChallengeCount: number;
  totalActivities: number;
  lastActivity: RecentActivity | null;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              Welcome back, {profile.displayName}
            </p>
            {lastActivity ? (
              <p className="truncate text-sm text-muted">
                Last activity: {lastActivity.name} ·{" "}
                {lastActivity.startDate.slice(0, 10)} in{" "}
                {lastActivity.challengeName}
              </p>
            ) : (
              <p className="text-sm text-muted">
                No activity logged yet — get moving!
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          <Stat label="Active challenges" value={activeChallengeCount} />
          <Stat label="Total activities" value={totalActivities} />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="whitespace-nowrap text-xs text-muted">{label}</p>
    </div>
  );
}
