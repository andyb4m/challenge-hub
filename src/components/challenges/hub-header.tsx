import type { User } from "@/types";
import type { RecentActivity } from "@/lib/challenges/service";
import { Card } from "@/components/ui/card";

export function HubHeader({
  profile,
  activeChallengeCount,
  totalChallengeCount,
  totalActivities,
  lastActivity,
}: {
  profile: Pick<User, "displayName" | "photoURL">;
  activeChallengeCount: number;
  totalChallengeCount: number;
  totalActivities: number;
  lastActivity: RecentActivity | null;
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
            Latest activity
          </p>
          {lastActivity ? (
            <p className="mt-1 truncate text-sm text-foreground">
              <span className="font-semibold">{lastActivity.name}</span> ·{" "}
              {lastActivity.startDate.slice(0, 10)} in{" "}
              {lastActivity.challengeName}
            </p>
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
