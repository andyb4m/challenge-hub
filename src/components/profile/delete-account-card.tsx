"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User as FirebaseUser } from "firebase/auth";
import { deleteAccount } from "@/lib/auth/service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DeleteAccountCard({ user }: { user: FirebaseUser }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount(user);
      router.push("/");
    } catch {
      setError(
        "Could not delete your account. Please try again, or email us."
      );
      setDeleting(false);
    }
  }

  return (
    <Card className="border-error/30">
      <CardHeader>
        <CardTitle className="text-error">Delete account</CardTitle>
        <CardDescription>
          Permanently deletes your profile and removes you from every
          challenge you&apos;re a member of, including your logged
          activities. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {confirming ? (
          <>
            <p className="text-sm font-medium text-error">
              Are you sure? This deletes your account and all your data.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, delete my account"}
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
            Delete account
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
