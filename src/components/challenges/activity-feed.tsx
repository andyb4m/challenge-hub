"use client";

import { useState } from "react";
import type { Activity, ChallengeMember } from "@/types";
import { deleteManualActivity } from "@/lib/challenges/service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatActivityStats(activity: Activity): string {
  const parts: string[] = [];
  if (activity.distance > 0) {
    parts.push(`${(activity.distance / 1000).toFixed(1)} km`);
  }
  const minutes = Math.round(activity.movingTime / 60);
  parts.push(minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`);
  return parts.join(" · ");
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
      await deleteManualActivity(activity);
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
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-center justify-between gap-3 border-b border-line/60 pb-3 last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {activity.name}
                  </p>
                  <p className="text-xs text-muted">
                    {nameByUid.get(activity.uid) ?? "Former member"} ·{" "}
                    {activity.startDate.slice(0, 10)} ·{" "}
                    {formatActivityStats(activity)}
                    {activity.source === "manual" && " · manual"}
                  </p>
                </div>
                {activity.source === "manual" &&
                  activity.uid === currentUid && (
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
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
