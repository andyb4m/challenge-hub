"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { useMyChallenges } from "@/lib/challenges/hooks";
import { Button } from "@/components/ui/button";

function ChallengesContent() {
  const { challenges, isLoading } = useMyChallenges();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your challenges</h1>
        <Link href="/challenges/new">
          <Button>New challenge</Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading challenges…</p>
      ) : challenges.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-600">
            You&apos;re not in any challenges yet.
          </p>
          <p className="mt-1 text-sm text-gray-500">
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
