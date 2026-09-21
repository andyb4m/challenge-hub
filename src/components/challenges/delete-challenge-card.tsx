"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { deleteChallenge } from "@/lib/challenges/service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DeleteChallengeCard({ challengeId }: { challengeId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!user) return;
    setDeleting(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      await deleteChallenge(challengeId, idToken);
      router.push("/challenges");
    } catch {
      setError("Could not delete this challenge. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <Card className="border border-error/30">
      <CardHeader>
        <CardTitle className="text-error">Delete challenge</CardTitle>
        <CardDescription>
          Permanently deletes this challenge for everyone, including every
          member&apos;s logged activities. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {confirming ? (
          <>
            <p className="text-sm font-medium text-error">
              Are you sure? This deletes the challenge and everyone&apos;s
              data in it.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, delete this challenge"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="destructive"
            onClick={() => setConfirming(true)}
            className="self-start"
          >
            Delete challenge
          </Button>
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
