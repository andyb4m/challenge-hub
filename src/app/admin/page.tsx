"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { useAuth } from "@/lib/auth/auth-context";
import { AdminStatsView } from "@/components/admin/admin-stats";
import { AdminTrendCards } from "@/components/admin/admin-trend-cards";
import { AdminWeeklyChart } from "@/components/admin/admin-weekly-chart";
import { AdminWeekdayHeatmap } from "@/components/admin/admin-weekday-heatmap";
import { AdminTopUsers } from "@/components/admin/admin-top-users";
import { AdminUserList } from "@/components/admin/admin-user-list";
import { AdminDashboardSkeleton } from "@/components/admin/admin-dashboard-skeleton";
import type { AdminStats, AdminUserSummary } from "@/types";

type FetchState =
  | { kind: "loading" }
  | { kind: "forbidden" }
  | { kind: "error" }
  | { kind: "ready"; stats: AdminStats; users: AdminUserSummary[] };

function AdminContent() {
  const { user } = useAuth();
  const [state, setState] = useState<FetchState>({ kind: "loading" });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    user
      .getIdToken()
      .then((idToken) =>
        fetch("/api/admin/dashboard", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
      )
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) {
          setState({ kind: "forbidden" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const body = (await res.json()) as { stats: AdminStats; users: AdminUserSummary[] };
        setState({ kind: "ready", stats: body.stats, users: body.users });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (state.kind === "loading") {
    return <AdminDashboardSkeleton />;
  }

  if (state.kind === "forbidden") {
    return (
      <p className="text-sm text-muted">
        You don&apos;t have access to this page.
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="text-sm text-error">
        Could not load the dashboard. Please try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminTrendCards
        newUsersTrend={state.stats.newUsersTrend}
        activitiesTrend={state.stats.activitiesTrend}
      />
      <AdminWeeklyChart data={state.stats.weeklyActivity} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminWeekdayHeatmap counts={state.stats.activityByWeekday} />
        <AdminTopUsers users={state.users} />
      </div>
      <AdminStatsView stats={state.stats} />
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-foreground">Users</h2>
        <AdminUserList users={state.users} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4 py-8">
        <h1 className="text-2xl font-bold text-foreground">Admin dashboard</h1>
        <AdminContent />
      </main>
    </RequireAuth>
  );
}
