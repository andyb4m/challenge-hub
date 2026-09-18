import Link from "next/link";
import type { AdminUserSummary } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

export function AdminUserList({ users }: { users: AdminUserSummary[] }) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted">No users yet.</CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {users.map((user) => (
        <Link key={user.uid} href={`/admin/users/${user.uid}`} className="block">
          <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-card-hover">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {user.displayName}
                  {user.stravaConnected && (
                    <span className="ml-1.5 rounded-full bg-[#FC4C02]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FC4C02]">
                      Strava
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <div className="shrink-0 text-right text-xs text-muted">
                <p>
                  {user.challengeCount} {user.challengeCount === 1 ? "challenge" : "challenges"} ·{" "}
                  {user.activityCount} {user.activityCount === 1 ? "activity" : "activities"}
                </p>
                <p className="text-faint">
                  {user.lastActivityDate
                    ? `Last active ${user.lastActivityDate}`
                    : "No activity yet"}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
