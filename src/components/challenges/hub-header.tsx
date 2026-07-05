import type { User } from "@/types";
import { Card } from "@/components/ui/card";

export function HubHeader({
  profile,
  activeChallengeCount,
  totalChallengeCount,
  totalActivities,
}: {
  profile: Pick<User, "displayName" | "photoURL">;
  activeChallengeCount: number;
  totalChallengeCount: number;
  totalActivities: number;
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
