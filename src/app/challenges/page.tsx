"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { ChallengeListSkeleton } from "@/components/challenges/challenge-list-skeleton";
import { HubHeader } from "@/components/challenges/hub-header";
import { RecentActivityCard } from "@/components/challenges/recent-activity-card";
import { useAuth } from "@/lib/auth/auth-context";
import { useMyChallenges, useMyOverview } from "@/lib/challenges/hooks";
import { localToday, splitChallengesForHub } from "@/lib/challenges/scoring";
import { Button } from "@/components/ui/button";

const PAST_PREVIEW_COUNT = 3;

function ChallengesContent() {
  const { profile } = useAuth();
  const { challenges, isLoading } = useMyChallenges();
  const overview = useMyOverview(challenges);
  const { current, past } = splitChallengesForHub(challenges, localToday());

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      {profile && (
        <HubHeader
          profile={profile}
          activeChallengeCount={overview.activeChallengeCount}
          totalChallengeCount={overview.totalChallengeCount}
          totalActivities={overview.totalActivities}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Your challenges</h1>
        <Link href="/challenges/new">
          <Button size="icon" className="rounded-full" aria-label="New challenge">
            <PlusIcon className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <ChallengeListSkeleton />
      ) : challenges.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-muted">
            You&apos;re not in any challenges yet.
          </p>
          <p className="mt-1 text-sm text-muted">
            Create one and share the invite link, or ask a friend for theirs.
          </p>
        </div>
      ) : current.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-muted">No active or upcoming challenges.</p>
          <p className="mt-1 text-sm text-muted">
            Create one, or check your past challenges below.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {current.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Past challenges
            </h2>
            {past.length > PAST_PREVIEW_COUNT && (
              <Link
                href="/challenges/past"
                className="text-sm text-muted hover:text-foreground"
              >
                See all
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {past.slice(0, PAST_PREVIEW_COUNT).map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Recent activity</h2>
        <Link href="/activity" className="text-sm text-muted hover:text-foreground">
          See all
        </Link>
      </div>
      <RecentActivityCard activities={overview.recentActivities} />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
