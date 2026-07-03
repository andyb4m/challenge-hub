"use client";

import type { Challenge, ChallengeMember } from "@/types";
import {
  challengeScoring,
  formatScore,
  formatTotal,
  memberProgress,
  memberScore,
  rankMembersForChallenge,
} from "@/lib/challenges/scoring";
import { DEFAULT_ZONE_CONFIG, hasZoneBonus } from "@/lib/challenges/zone";
import { VARIETY_KINDS } from "@/lib/challenges/variety";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ZONE_KEYS = ["z2", "z3", "z4", "z5"] as const;

function leaderboardBlurb(challenge: Challenge): string {
  switch (challengeScoring(challenge)) {
    case "goal":
      return challenge.goal
        ? `First to ${formatTotal(challenge.goal.value, challenge.goal.unit)} — or the furthest along when time runs out.`
        : "";
    case "zone":
      return "Points from zones, workouts and recovery. ⭐ = 80/20 low-intensity bonus (×1.15) active.";
    case "variety":
      return `Most different sports wins — ${VARIETY_KINDS.length} kinds to collect.`;
  }
}

export function Leaderboard({
  challenge,
  members,
  currentUid,
}: {
  challenge: Challenge;
  members: ChallengeMember[];
  currentUid: string;
}) {
  const scoring = challengeScoring(challenge);
  const ranked = rankMembersForChallenge(challenge, members);
  const leaderScore = ranked.length > 0 ? memberScore(challenge, ranked[0]) : 0;
  const zoneConfig = challenge.zoneConfig ?? DEFAULT_ZONE_CONFIG;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>{leaderboardBlurb(challenge)}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {ranked.map((member, index) => {
            const progress = memberProgress(challenge, member, leaderScore);
            const isMe = member.uid === currentUid;
            const bonus = scoring === "zone" && hasZoneBonus(member, zoneConfig);
            return (
              <li key={member.uid} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-semibold text-muted">
                  {index === 0 ? "🏆" : index + 1}
                </span>
                {member.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photoURL}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-line text-xs font-medium text-muted">
                    {member.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        isMe ? "font-semibold text-foreground" : "text-muted"
                      )}
                    >
                      {member.displayName}
                      {isMe && " (you)"}
                      {bonus && (
                        <span
                          className="ml-1.5 rounded-full bg-warning/10 px-1.5 py-0.5 text-xs font-semibold text-warning"
                          title="80/20 low-intensity bonus active: ×1.15"
                        >
                          ⭐ +15%
                        </span>
                      )}
                    </span>
                    <span className="whitespace-nowrap text-sm text-muted">
                      {formatScore(challenge, member)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-background-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        scoring === "goal" && progress >= 1
                          ? "bg-success"
                          : "bg-gradient-primary"
                      )}
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  {scoring === "zone" && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-faint">
                      <span>
                        {member.activityCount}{" "}
                        {member.activityCount === 1 ? "activity" : "activities"}
                      </span>
                      {ZONE_KEYS.map((zone) => (
                        <span key={zone} className="uppercase">
                          {zone} {Math.round(member.zoneMinutes?.[zone] ?? 0)}m
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {ranked.length === 0 && (
          <p className="text-sm text-muted">No members yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
