"use client";

import Link from "next/link";
import type { Challenge } from "@/types";
import {
  challengeStatus,
  formatGoal,
  localToday,
} from "@/lib/challenges/scoring";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statusStyles = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  ended: "bg-gray-100 text-gray-500",
} as const;

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const status = challengeStatus(challenge, localToday());

  return (
    <Link href={`/challenges/${challenge.id}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900">{challenge.name}</h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                statusStyles[status]
              )}
            >
              {status}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {challenge.sportType} · Goal: {formatGoal(challenge.goal)}
          </p>
          <p className="text-xs text-gray-400">
            {challenge.startDate} → {challenge.endDate} ·{" "}
            {challenge.memberCount}{" "}
            {challenge.memberCount === 1 ? "member" : "members"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
