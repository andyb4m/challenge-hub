"use client";

import { useEffect, useMemo, useState } from "react";
import type { Activity, ChallengeMember } from "@/types";
import { deleteActivity } from "@/lib/challenges/service";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SortKey = "date" | "points" | "distance";
const SORT_LABELS: Record<SortKey, string> = {
  date: "Date",
  points: "Points",
  distance: "Distance",
};

function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
}

/** The metrics line under the name/date — points render separately (bold), so they're excluded here. */
function formatActivityMetrics(activity: Activity): string | null {
  if (activity.zoneKind) {
    if (activity.zones) {
      const zoneBits = (["z2", "z3", "z4", "z5"] as const)
        .filter((z) => activity.zones![z] > 0)
        .map((z) => `${z}: ${Math.round(activity.zones![z])}m`);
      if (zoneBits.length > 0) {
        // Total duration alongside the breakdown, not instead of it.
        return [formatMinutes(activity.movingTime), ...zoneBits].join(" · ");
      }
    } else if (activity.movingTime > 0) {
      return formatMinutes(activity.movingTime);
    }
    return null;
  }

  // Variety entries: the name already carries the kind; just say it counts
  if (activity.varietyKind) {
    return "counts once";
  }

  const parts: string[] = [];
  if (activity.distance > 0) {
    parts.push(`${(activity.distance / 1000).toFixed(1)} km`);
  }
  parts.push(formatMinutes(activity.movingTime));
  return parts.join(" · ");
}

function activityPoints(activity: Activity): number | null {
  return activity.zoneKind ? (activity.points ?? 0) : null;
}

export function ActivityFeed({
  activities,
  members,
  currentUid,
}: {
  activities: Activity[];
  members: ChallengeMember[];
  currentUid: string;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const nameByUid = new Map(members.map((m) => [m.uid, m.displayName]));

  // Only offer a sort option if it would actually distinguish entries —
  // e.g. "Points" is meaningless clutter on a goal challenge, where every
  // activity's points are null.
  const sortOptions: SortKey[] = useMemo(() => {
    const options: SortKey[] = ["date"];
    if (activities.some((a) => activityPoints(a) !== null)) options.push("points");
    if (activities.some((a) => a.distance > 0)) options.push("distance");
    return options;
  }, [activities]);

  // Defensive: if the available options ever narrow out from under the
  // current selection (e.g. this component were reused across challenge
  // types without remounting), fall back to the one option that's always
  // offered rather than silently sorting by a hidden key.
  useEffect(() => {
    if (!sortOptions.includes(sortBy)) setSortBy("date");
  }, [sortOptions, sortBy]);

  const sorted = useMemo(() => {
    if (sortBy === "date") return activities; // already newest-first from the caller
    const withValue = (a: Activity) =>
      sortBy === "points" ? activityPoints(a) ?? 0 : a.distance;
    return [...activities].sort((a, b) => withValue(b) - withValue(a));
  }, [activities, sortBy]);

  async function handleDelete(activity: Activity) {
    setDeletingId(activity.id);
    try {
      await deleteActivity(activity);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Activities</CardTitle>
        {activities.length > 0 && sortOptions.length > 1 && (
          <Select
            aria-label="Sort activities by"
            className="h-8 w-auto px-2 py-0 text-xs"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
          >
            {sortOptions.map((key) => (
              <option key={key} value={key}>
                Sort: {SORT_LABELS[key]}
              </option>
            ))}
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing logged yet — be the first!
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sorted.map((activity) => {
              const points = activityPoints(activity);
              const metrics = formatActivityMetrics(activity);
              return (
              <li
                key={activity.id}
                className="flex items-center justify-between gap-3 border-b border-line/60 pb-3 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-foreground">
                        {activity.source === "strava" && activity.stravaActivityId ? (
                          <a
                            href={`https://www.strava.com/activities/${activity.stravaActivityId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            title="View on Strava"
                          >
                            {activity.name}
                          </a>
                        ) : (
                          activity.name
                        )}
                      </p>
                      {activity.source === "strava" && (
                        <span className="shrink-0 rounded-full bg-[#FC4C02]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#FC4C02]">
                          Strava
                        </span>
                      )}
                    </div>
                    {points !== null && (
                      <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-foreground">
                        {points.toLocaleString()} pts
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {nameByUid.get(activity.uid) ?? "Former member"} ·{" "}
                    {activity.startDate.slice(0, 10)}
                  </p>
                  {metrics && (
                    <p className="mt-0.5 text-xs text-faint">{metrics}</p>
                  )}
                </div>
                <div className="flex w-8 shrink-0 items-center justify-center">
                  {activity.uid === currentUid && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-error hover:bg-error/10"
                      onClick={() => handleDelete(activity)}
                      disabled={deletingId === activity.id}
                      aria-label="Remove activity"
                      title="Remove activity"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
