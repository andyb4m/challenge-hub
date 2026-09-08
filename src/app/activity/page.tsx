"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { RecentActivityCard } from "@/components/challenges/recent-activity-card";
import { ActivityListSkeleton } from "@/components/challenges/activity-list-skeleton";
import { useMyActivities, useMyChallenges } from "@/lib/challenges/hooks";

function ActivityContent() {
  const { challenges, isLoading: loadingChallenges } = useMyChallenges();
  const { activities, isLoading: loadingActivities } =
    useMyActivities(challenges);

  const loading = loadingChallenges || loadingActivities;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">Activity</h1>
      {loading ? (
        <ActivityListSkeleton />
      ) : (
        <RecentActivityCard activities={activities} variant="detailed" />
      )}
    </main>
  );
}

export default function ActivityPage() {
  return (
    <RequireAuth>
      <ActivityContent />
    </RequireAuth>
  );
}
