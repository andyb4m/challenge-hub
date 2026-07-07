"use client";

import { Suspense } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { RequireAuth } from "@/components/auth/require-auth";
import { ProfileForm } from "@/components/profile/profile-form";
import { StravaCard } from "@/components/profile/strava-card";
import { DeleteAccountCard } from "@/components/profile/delete-account-card";
import { ProfileSkeleton } from "@/components/profile/profile-skeleton";

function ProfileContent() {
  const { user, profile } = useAuth();

  // RequireAuth guarantees user; profile may lag one render behind
  if (!user || !profile) {
    return <ProfileSkeleton />;
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
      <ProfileForm user={user} profile={profile} />
      <StravaCard user={user} profile={profile} />
      <DeleteAccountCard user={user} />
    </main>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      {/* useSearchParams (in StravaCard) requires a Suspense boundary during prerendering */}
      <Suspense>
        <ProfileContent />
      </Suspense>
    </RequireAuth>
  );
}
