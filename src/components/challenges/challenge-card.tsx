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

// Tinted badge pattern from the legacy design: rgba(color, .1) fill + colored text
const statusStyles = {
  upcoming: "bg-info/10 text-info",
  active: "bg-success/10 text-success",
  ended: "bg-white/5 text-muted",
} as const;

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const status = challengeStatus(challenge, localToday());

  return (
    <Link href={`/challenges/${challenge.id}`} className="block">
      <Card className="transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:bg-card-hover">
        <CardContent className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">{challenge.name}</h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                statusStyles[status]
              )}
            >
              {status}
            </span>
          </div>
          <p className="text-sm text-muted">
            {challenge.sportType} · Goal: {formatGoal(challenge.goal)}
          </p>
          <p className="text-xs text-faint">
            {challenge.startDate} → {challenge.endDate} ·{" "}
            {challenge.memberCount}{" "}
            {challenge.memberCount === 1 ? "member" : "members"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
