"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/lib/auth/auth-context";
import {
  useActivities,
  useChallenge,
  useMembers,
} from "@/lib/challenges/hooks";
import {
  challengeScoring,
  challengeStatus,
  challengeSummary,
  localToday,
} from "@/lib/challenges/scoring";
import { Leaderboard } from "@/components/challenges/leaderboard";
import { ActivityFeed } from "@/components/challenges/activity-feed";
import { LogActivityForm } from "@/components/challenges/log-activity-form";
import { ZoneLogForm } from "@/components/challenges/zone-log-form";
import { VarietyLogForm } from "@/components/challenges/variety-log-form";
import { ZoneAnalytics } from "@/components/challenges/zone-analytics";
import { ProgressChart } from "@/components/challenges/progress-chart";
import { buildZoneProgressChart } from "@/lib/challenges/progress-chart";
import { VarietyCollection } from "@/components/challenges/variety-collection";
import { VarietyManageCard } from "@/components/challenges/variety-manage-card";
import { InviteLinkButton } from "@/components/challenges/invite-link-button";

function ChallengeDetail({ challengeId }: { challengeId: string }) {
  const { user, profile } = useAuth();
  const { challenge, loading } = useChallenge(challengeId);
  const members = useMembers(challengeId);
  const activities = useActivities(challengeId);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted">Loading challenge…</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted">Challenge not found.</p>
      </div>
    );
  }

  const status = challengeStatus(challenge, localToday());
  const isMember = (profile?.challengeIds ?? []).includes(challenge.id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            {challenge.name}
          </h1>
          {isMember && <InviteLinkButton token={challenge.inviteToken} />}
        </div>
        <p className="text-sm text-muted">
          {challengeSummary(challenge)} · {challenge.startDate} →{" "}
          {challenge.endDate}
        </p>
        {challenge.description && (
          <p className="text-sm text-muted">{challenge.description}</p>
        )}
        {status === "ended" && (
          <p className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error">
            Challenge completed! 🏁 Check out the final ranking below.
          </p>
        )}
        {status === "upcoming" && (
          <p className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-sm font-medium text-info">
            Starts {challenge.startDate} — get your shoes ready.
          </p>
        )}
      </header>

      {isMember &&
        status === "active" &&
        (() => {
          switch (challengeScoring(challenge)) {
            case "zone":
              return (
                <ZoneLogForm
                  challenge={challenge}
                  uid={user.uid}
                  activities={activities}
                />
              );
            case "variety": {
              const me = members.find((m) => m.uid === user.uid);
              return me ? (
                <VarietyLogForm challenge={challenge} member={me} />
              ) : null;
            }
            default:
              return <LogActivityForm challenge={challenge} uid={user.uid} />;
          }
        })()}

      <Leaderboard
        challenge={challenge}
        members={members}
        currentUid={user.uid}
      />

      {challengeScoring(challenge) === "zone" && (
        <>
          <ZoneAnalytics challenge={challenge} members={members} />
          <ProgressChart data={buildZoneProgressChart(activities, members)} />
        </>
      )}

      {challengeScoring(challenge) === "variety" && (
        <>
          {(() => {
            const me = members.find((m) => m.uid === user.uid);
            return me ? (
              <VarietyCollection challenge={challenge} member={me} />
            ) : null;
          })()}
          {challenge.createdBy === user.uid && (
            <VarietyManageCard challenge={challenge} />
          )}
        </>
      )}

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
