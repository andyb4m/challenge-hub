"use client";

import type { Challenge, ChallengeMember } from "@/types";
import {
  DEFAULT_ZONE_CONFIG,
  hasZoneBonus,
  lowIntensityRatio,
} from "@/lib/challenges/zone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The legacy "Training Analytics" card: each member's low/high intensity
 * ratio with a good/poor badge, plus the 80/20 explainer.
 */
export function ZoneAnalytics({
  challenge,
  members,
}: {
  challenge: Challenge;
  members: ChallengeMember[];
}) {
  const config = challenge.zoneConfig ?? DEFAULT_ZONE_CONFIG;
  const withActivity = members.filter(
    (m) => lowIntensityRatio(m) !== null
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training analytics</CardTitle>
        <CardDescription>
          Share of low-intensity training (Z2 + recovery) vs high (Z4 + Z5).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {withActivity.length === 0 ? (
          <p className="text-sm text-muted">
            No zone training logged yet — ratios appear once someone starts.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {withActivity.map((member) => {
              const ratio = lowIntensityRatio(member)!;
              const inBand = hasZoneBonus(member, config);
              return (
                <li
                  key={member.uid}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate text-muted">
                    {member.displayName}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      inBand
                        ? "bg-success/10 text-success"
                        : "bg-error/10 text-error"
                    )}
                  >
                    {Math.round(ratio * 100)}% low intensity
                    {inBand && " · bonus ⭐"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-xs text-info">
          <span className="font-semibold">The 80/20 rule:</span> endurance
          athletes improve fastest when most training stays easy. Keep your
          low-intensity share between {Math.round(config.bonus.low * 100)}%
          and {Math.round(config.bonus.high * 100)}% and all your points get
          ×{config.bonus.multiplier}.
        </p>
      </CardContent>
    </Card>
  );
}
