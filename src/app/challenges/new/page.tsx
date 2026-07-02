"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { ChallengeForm } from "@/components/challenges/challenge-form";

export default function NewChallengePage() {
  return (
    <RequireAuth>
      <main className="mx-auto max-w-2xl p-4 py-8">
        <ChallengeForm />
      </main>
    </RequireAuth>
  );
}
