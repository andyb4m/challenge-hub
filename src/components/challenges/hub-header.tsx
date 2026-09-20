"use client";

import { useEffect, useState } from "react";
import type { User } from "@/types";

// Client-only: the greeting depends on the viewer's local hour, which the
// server render can't know (and would otherwise mismatch on hydration).
function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning — time to get moving.";
  if (hour < 18) return "Good afternoon — keep the streak going.";
  return "Good evening — still time to log a workout.";
}

export function HubHeader({
  profile,
}: {
  profile: Pick<User, "displayName" | "photoURL">;
}) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <div className="flex items-center gap-3">
      {profile.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.photoURL}
          alt=""
          referrerPolicy="no-referrer"
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-line text-lg font-medium text-muted">
          {profile.displayName.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xl font-bold tracking-tight text-foreground">
          Hi {profile.displayName}
        </p>
        <p className="text-sm text-muted">{greeting ?? " "}</p>
      </div>
    </div>
  );
}
