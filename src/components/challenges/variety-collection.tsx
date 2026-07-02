"use client";

import type { ChallengeMember } from "@/types";
import { VARIETY_KINDS } from "@/lib/challenges/variety";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** The signed-in member's kind collection: collected chips lit, rest dimmed. */
export function VarietyCollection({ member }: { member: ChallengeMember }) {
  const collected = new Set(member.kinds ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Your collection · {collected.size}/{VARIETY_KINDS.length}
        </CardTitle>
        <CardDescription>
          Every kind you log lights up — collect them all!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {VARIETY_KINDS.map((kind) => {
            const has = collected.has(kind.id);
            return (
              <span
                key={kind.id}
                title={kind.label}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                  has
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-line bg-background-secondary text-faint"
                )}
              >
                {kind.emoji} {kind.label}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
