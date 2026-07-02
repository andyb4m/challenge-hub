"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/lib/auth/auth-context";
import { findChallengeByToken, joinChallenge } from "@/lib/challenges/service";
import {
  checkJoinEligibility,
  type JoinEligibility,
} from "@/lib/challenges/invite";
import { challengeSummary, localToday } from "@/lib/challenges/scoring";
import type { Challenge } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function JoinContent({ token }: { token: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    findChallengeByToken(token)
      .then((found) => (found ? setChallenge(found) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [token]);

  if (notFound) {
    return (
      <p className="text-center text-muted">
        This invite link isn&apos;t valid. Ask your friend to send it again.
      </p>
    );
  }

  if (!challenge || !profile) {
    return <p className="text-center text-sm text-muted">Loading…</p>;
  }

  const eligibility: JoinEligibility = checkJoinEligibility(
    challenge,
    profile,
    localToday()
  );

  async function handleJoin() {
    if (!challenge || !profile) return;
    setJoining(true);
    setError(null);
    try {
      await joinChallenge(challenge, profile);
      router.push(`/challenges/${challenge.id}`);
    } catch {
      setError("Could not join the challenge. Please try again.");
      setJoining(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>You&apos;re invited: {challenge.name}</CardTitle>
        <CardDescription>
          {challengeSummary(challenge)} · {challenge.startDate} →{" "}
          {challenge.endDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {challenge.description && (
          <p className="text-sm text-muted">{challenge.description}</p>
        )}
        <p className="text-sm text-muted">
          {challenge.memberCount}{" "}
          {challenge.memberCount === 1 ? "member" : "members"} so far.
        </p>

        {eligibility.canJoin ? (
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="self-start"
          >
            {joining ? "Joining…" : "Join challenge"}
          </Button>
        ) : eligibility.reason === "already-member" ? (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => router.push(`/challenges/${challenge.id}`)}
          >
            You&apos;re already in — open it
          </Button>
        ) : (
          <p className="text-sm font-medium text-muted">
            This challenge has already ended.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function JoinPage({ params }: { params: { token: string } }) {
  return (
    <RequireAuth>
      <main className="flex min-h-[70vh] items-center justify-center p-4">
        <JoinContent token={params.token} />
      </main>
    </RequireAuth>
  );
}
