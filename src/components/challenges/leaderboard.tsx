"use client";

import type { Challenge, ChallengeMember } from "@/types";
import {
  formatTotal,
  goalProgress,
  memberTotalInUnit,
  rankMembers,
} from "@/lib/challenges/scoring";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Leaderboard({
  challenge,
  members,
  currentUid,
}: {
  challenge: Challenge;
  members: ChallengeMember[];
  currentUid: string;
}) {
  const ranked = rankMembers(members, challenge.goal.unit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>
          First to {formatTotal(challenge.goal.value, challenge.goal.unit)} —
          or the furthest along when time runs out.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {ranked.map((member, index) => {
            const progress = goalProgress(member, challenge.goal);
            const isMe = member.uid === currentUid;
            return (
              <li key={member.uid} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-semibold text-gray-500">
                  {index + 1}
                </span>
                {member.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.photoURL}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                    {member.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        isMe ? "font-semibold text-gray-900" : "text-gray-700"
                      )}
                    >
                      {member.displayName}
                      {isMe && " (you)"}
                    </span>
                    <span className="whitespace-nowrap text-sm text-gray-600">
                      {formatTotal(
                        memberTotalInUnit(member, challenge.goal.unit),
                        challenge.goal.unit
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        progress >= 1 ? "bg-green-500" : "bg-gray-800"
                      )}
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {ranked.length === 0 && (
          <p className="text-sm text-gray-500">No members yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
