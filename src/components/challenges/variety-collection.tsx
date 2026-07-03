"use client";

import type { Challenge, ChallengeMember } from "@/types";
import {
  kindCountFor,
  varietyKinds,
  varietyMaxScore,
  varietyScore,
} from "@/lib/challenges/variety";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** The signed-in member's collection: counted chips lit, rest dimmed. */
export function VarietyCollection({
  challenge,
  member,
}: {
  challenge: Challenge;
  member: ChallengeMember;
}) {
  const kinds = varietyKinds(challenge);
  const score = varietyScore(member, kinds);
  const max = varietyMaxScore(kinds);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Your collection · {score}/{max}
        </CardTitle>
        <CardDescription>
          Every activity you log lights up — collect them all!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {kinds.map((kind) => {
            const counted = Math.min(kindCountFor(member, kind.id), kind.maxCount);
            const full = counted >= kind.maxCount;
            return (
              <span
                key={kind.id}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                  full
                    ? "border-success/50 bg-success/10 text-foreground"
                    : counted > 0
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-line bg-background-secondary text-faint"
                )}
              >
                {kind.label}
                {kind.maxCount > 1 && ` ${counted}/${kind.maxCount}`}
                {full && " ✓"}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
