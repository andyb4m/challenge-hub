"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Activity, ChallengeMember } from "@/types";
import { deleteActivity } from "@/lib/challenges/service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SortKey = "date" | "points" | "distance";
const SORT_LABELS: Record<SortKey, string> = {
  date: "Date",
  points: "Points",
  distance: "Distance",
};

const PAGE_SIZE = 10;

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
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const nameByUid = new Map(members.map((m) => [m.uid, m.displayName]));

  useEffect(() => {
    if (!sortMenuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setSortMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSortMenuOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sortMenuOpen]);

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

  const hasOthersActivity = activities.some((a) => a.uid !== currentUid);

  const filtered = useMemo(
    () => (mineOnly ? activities.filter((a) => a.uid === currentUid) : activities),
    [activities, mineOnly, currentUid]
  );

  const sorted = useMemo(() => {
    if (sortBy === "date") return filtered; // already newest-first from the caller
    const withValue = (a: Activity) =>
      sortBy === "points" ? activityPoints(a) ?? 0 : a.distance;
    return [...filtered].sort((a, b) => withValue(b) - withValue(a));
  }, [filtered, sortBy]);

  // Re-paging on sort/filter change (rather than keeping the scroll
  // position) so "show more" always reveals the next slice of the
  // *current* view — otherwise switching sort or the "mine only" filter
  // after scrolling deep in could show an arbitrary, order-crossing slice.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sortBy, mineOnly]);

  const visible = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visible.length;

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
        {activities.length > 0 && (
          <div className="flex items-center gap-1">
            {hasOthersActivity && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full",
                  mineOnly && "bg-primary/10 text-primary-light"
                )}
                onClick={() => setMineOnly((v) => !v)}
                aria-pressed={mineOnly}
                aria-label={mineOnly ? "Showing only my activities" : "Show only my activities"}
                title="Only my activities"
              >
                <PersonIcon className="h-4 w-4" />
              </Button>
            )}
            {sortOptions.length > 1 && (
              <div ref={sortMenuRef} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setSortMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={sortMenuOpen}
                  aria-label={`Sort by ${SORT_LABELS[sortBy]}`}
                  title={`Sort by ${SORT_LABELS[sortBy]}`}
                >
                  <SortIcon className="h-4 w-4" />
                </Button>
                {sortMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-10 z-20 w-36 overflow-hidden rounded-xl border border-line bg-card shadow-card"
                  >
                    {sortOptions.map((key) => (
                      <button
                        key={key}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setSortBy(key);
                          setSortMenuOpen(false);
                        }}
                        className={cn(
                          "block w-full px-4 py-2.5 text-left text-sm hover:bg-white/5",
                          key === sortBy
                            ? "font-semibold text-foreground"
                            : "text-muted hover:text-foreground"
                        )}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing logged yet — be the first!
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((activity) => {
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
        {remaining > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          >
            Show {Math.min(remaining, PAGE_SIZE)} more
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PersonIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6" />
    </svg>
  );
}

function SortIcon({ className }: { className?: string }) {
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
      <path d="M7 4v16M7 4l-3 3M7 4l3 3" />
      <path d="M17 20V4M17 20l-3-3M17 20l3-3" />
    </svg>
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
