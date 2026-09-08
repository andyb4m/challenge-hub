"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { ChallengeListSkeleton } from "@/components/challenges/challenge-list-skeleton";
import { useMyChallenges } from "@/lib/challenges/hooks";
import { localToday, splitChallengesForHub } from "@/lib/challenges/scoring";

function PastChallengesContent() {
  const { challenges, isLoading } = useMyChallenges();
  const { past } = splitChallengesForHub(challenges, localToday());

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/challenges"
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          ← Challenges
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          Past challenges
        </h1>
      </div>

      {isLoading ? (
        <ChallengeListSkeleton />
      ) : past.length === 0 ? (
        <p className="text-sm text-muted">No past challenges yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {past.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}
    </main>
  );
}

export default function PastChallengesPage() {
  return (
    <RequireAuth>
      <PastChallengesContent />
    </RequireAuth>
  );
}
