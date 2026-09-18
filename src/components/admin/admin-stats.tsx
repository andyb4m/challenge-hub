import type { AdminStats } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="whitespace-nowrap text-xs text-muted">{label}</p>
    </div>
  );
}

export function AdminStatsView({ stats }: { stats: AdminStats }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total" value={stats.totalUsers} />
          <Stat label="New (7d)" value={stats.newUsersLast7Days} />
          <Stat label="New (30d)" value={stats.newUsersLast30Days} />
          <Stat label="Strava connected" value={stats.stravaConnectedUsers} />
          <Stat label="Active (7d)" value={stats.usersActiveLast7Days} />
          <Stat label="Active (30d)" value={stats.usersActiveLast30Days} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Challenges</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total" value={stats.totalChallenges} />
          <Stat label="Active" value={stats.activeChallenges} />
          <Stat label="Upcoming" value={stats.upcomingChallenges} />
          <Stat label="Ended" value={stats.endedChallenges} />
          <Stat label="Goal" value={stats.challengesByType.goal} />
          <Stat label="Zone" value={stats.challengesByType.zone} />
          <Stat label="Variety" value={stats.challengesByType.variety} />
          <Stat label="Avg members" value={stats.avgMembersPerChallenge} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total logged" value={stats.totalActivities} />
            <Stat label="Manual" value={stats.manualActivities} />
            <Stat label="Strava" value={stats.stravaActivities} />
          </div>
          {stats.mostActiveChallenge && (
            <p className="text-sm text-muted">
              Most active:{" "}
              <span className="text-foreground">{stats.mostActiveChallenge.name}</span>{" "}
              ({stats.mostActiveChallenge.activityCount}{" "}
              {stats.mostActiveChallenge.activityCount === 1 ? "activity" : "activities"})
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
