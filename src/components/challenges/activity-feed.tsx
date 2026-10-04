"use client";

import { useState } from "react";
import type { Activity, ChallengeMember } from "@/types";
import { deleteActivity } from "@/lib/challenges/service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
      if (zoneBits.length > 0) return zoneBits.join(" ");
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
  const nameByUid = new Map(members.map((m) => [m.uid, m.displayName]));

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
      <CardHeader>
        <CardTitle>Activities</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing logged yet — be the first!
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {activities.map((activity) => {
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
                {activity.uid === currentUid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:bg-error/10"
                    onClick={() => handleDelete(activity)}
                    disabled={deletingId === activity.id}
                  >
                    {deletingId === activity.id ? "Removing…" : "Remove"}
                  </Button>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
