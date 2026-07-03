"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { HubHeader } from "@/components/challenges/hub-header";
import { useAuth } from "@/lib/auth/auth-context";
import { useMyChallenges, useMyOverview } from "@/lib/challenges/hooks";
import { Button } from "@/components/ui/button";

function ChallengesContent() {
  const { profile } = useAuth();
  const { challenges, isLoading } = useMyChallenges();
  const overview = useMyOverview(challenges);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      {profile && (
        <HubHeader
          profile={profile}
          activeChallengeCount={overview.activeChallengeCount}
          totalActivities={overview.totalActivities}
          lastActivity={overview.lastActivity}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Your challenges</h1>
        <Link href="/challenges/new">
          <Button>New challenge</Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading challenges…</p>
      ) : challenges.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-muted">
            You&apos;re not in any challenges yet.
          </p>
          <p className="mt-1 text-sm text-muted">
            Create one and share the invite link, or ask a friend for theirs.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {challenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function ChallengesPage() {
  return (
    <RequireAuth>
      <ChallengesContent />
    </RequireAuth>
  );
}
