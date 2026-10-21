"use client";

import type { Challenge, ChallengeMember } from "@/types";
import {
  DEFAULT_ZONE_CONFIG,
  displayRatioPercent,
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
          <ul className="flex flex-col gap-3">
            {withActivity.map((member) => {
              const ratio = lowIntensityRatio(member)!;
              const inBand = hasZoneBonus(member, config);
              return (
                <li key={member.uid} className="flex flex-col gap-1.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-muted">
                      {member.displayName}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-semibold",
                        inBand ? "text-success" : "text-error"
                      )}
                    >
                      {displayRatioPercent(ratio, config)}% low intensity
                    </span>
                  </div>
                  <div
                    className="relative h-1.5 overflow-hidden rounded-full bg-background-secondary"
                    aria-hidden="true"
                  >
                    <div
                      className="absolute inset-y-0 rounded-full bg-success/20"
                      style={{
                        left: `${config.bonus.low * 100}%`,
                        width: `${(config.bonus.high - config.bonus.low) * 100}%`,
                      }}
                    />
                    <div
                      className={cn(
                        "absolute top-1/2 h-2.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full",
                        inBand ? "bg-success" : "bg-error"
                      )}
                      style={{ left: `${ratio * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-xs text-info">
          <span className="font-semibold">Low-intensity bonus:</span> endurance
          athletes improve fastest when most training stays easy. Keep your
          low-intensity share between {Math.round(config.bonus.low * 100)}%
          and {Math.round(config.bonus.high * 100)}% and all your points get
          ×{config.bonus.multiplier}.
        </p>
      </CardContent>
    </Card>
  );
}
