"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/lib/auth/auth-context";
import {
  useActivities,
  useChallenge,
  useMembers,
} from "@/lib/challenges/hooks";
import {
  challengeStatus,
  formatGoal,
  localToday,
} from "@/lib/challenges/scoring";
import { Leaderboard } from "@/components/challenges/leaderboard";
import { ActivityFeed } from "@/components/challenges/activity-feed";
import { LogActivityForm } from "@/components/challenges/log-activity-form";
import { InviteLinkButton } from "@/components/challenges/invite-link-button";

function ChallengeDetail({ challengeId }: { challengeId: string }) {
  const { user, profile } = useAuth();
  const { challenge, loading } = useChallenge(challengeId);
  const members = useMembers(challengeId);
  const activities = useActivities(challengeId);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500">Loading challenge…</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500">Challenge not found.</p>
      </div>
    );
  }

  const status = challengeStatus(challenge, localToday());
  const isMember = (profile?.challengeIds ?? []).includes(challenge.id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {challenge.name}
          </h1>
          {isMember && <InviteLinkButton token={challenge.inviteToken} />}
        </div>
        <p className="text-sm text-gray-600">
          {challenge.sportType} · Goal: {formatGoal(challenge.goal)} ·{" "}
          {challenge.startDate} → {challenge.endDate}
        </p>
        {challenge.description && (
          <p className="text-sm text-gray-500">{challenge.description}</p>
        )}
        {status === "ended" && (
          <p className="text-sm font-medium text-gray-500">
            This challenge has ended.
          </p>
        )}
        {status === "upcoming" && (
          <p className="text-sm font-medium text-blue-600">
            Starts {challenge.startDate}.
          </p>
        )}
      </header>

      {isMember && status === "active" && (
        <LogActivityForm challenge={challenge} uid={user.uid} />
      )}

      <Leaderboard
        challenge={challenge}
        members={members}
        currentUid={user.uid}
      />

      <ActivityFeed
        activities={activities}
        members={members}
        currentUid={user.uid}
      />
    </main>
  );
}

export default function ChallengePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <RequireAuth>
      <ChallengeDetail challengeId={params.id} />
    </RequireAuth>
  );
}
