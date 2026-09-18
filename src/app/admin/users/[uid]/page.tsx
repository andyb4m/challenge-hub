"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/lib/auth/auth-context";
import { RecentActivityCard } from "@/components/challenges/recent-activity-card";
import { AdminUserDetailSkeleton } from "@/components/admin/admin-user-detail-skeleton";
import type { RecentActivity } from "@/lib/challenges/service";

interface AdminUserDetail {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: string;
  stravaConnected: boolean;
  challengeCount: number;
}

type FetchState =
  | { kind: "loading" }
  | { kind: "forbidden" }
  | { kind: "not-found" }
  | { kind: "error" }
  | { kind: "ready"; user: AdminUserDetail; activities: RecentActivity[] };

function AdminUserDetailContent({ uid }: { uid: string }) {
  const { user: authUser } = useAuth();
  const [state, setState] = useState<FetchState>({ kind: "loading" });

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;

    authUser
      .getIdToken()
      .then((idToken) =>
        fetch(`/api/admin/users/${uid}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        })
      )
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) {
          setState({ kind: "forbidden" });
          return;
        }
        if (res.status === 404) {
          setState({ kind: "not-found" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const body = (await res.json()) as {
          user: AdminUserDetail;
          activities: RecentActivity[];
        };
        setState({ kind: "ready", user: body.user, activities: body.activities });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [authUser, uid]);

  if (state.kind === "loading") {
    return <AdminUserDetailSkeleton />;
  }

  if (state.kind === "forbidden") {
    return (
      <p className="text-sm text-muted">
        You don&apos;t have access to this page.
      </p>
    );
  }

  if (state.kind === "not-found") {
    return <p className="text-sm text-muted">User not found.</p>;
  }

  if (state.kind === "error") {
    return (
      <p className="text-sm text-error">
        Could not load this user. Please try again.
      </p>
    );
  }

  const { user, activities } = state;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          {user.displayName}
          {user.stravaConnected && (
            <span className="rounded-full bg-[#FC4C02]/10 px-2 py-0.5 text-xs font-semibold text-[#FC4C02]">
              Strava
            </span>
          )}
        </h1>
        <p className="text-sm text-muted">{user.email}</p>
        <p className="text-xs text-faint">
          Joined {user.createdAt.slice(0, 10)} · {user.challengeCount}{" "}
          {user.challengeCount === 1 ? "challenge" : "challenges"}
        </p>
      </div>

      <RecentActivityCard activities={activities} variant="detailed" />
    </div>
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: { uid: string };
}) {
  return (
    <RequireAuth>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
        <Link
          href="/admin"
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          ← Admin
        </Link>
        <AdminUserDetailContent uid={params.uid} />
      </main>
    </RequireAuth>
  );
}
