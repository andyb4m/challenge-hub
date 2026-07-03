"use client";

import { useState, type FormEvent } from "react";
import type { Activity, Challenge, ZoneActivityKind } from "@/types";
import { logZoneActivity } from "@/lib/challenges/service";
import {
  zoneActivitySchema,
  isDateInChallengeWindow,
} from "@/lib/challenges/validation";
import { firstError } from "@/lib/auth/validation";
import { localToday } from "@/lib/challenges/scoring";
import {
  DEFAULT_ZONE_CONFIG,
  recoveryUsedInWeek,
  zoneActivityPoints,
  type OthersTier,
  type ZoneActivityInput,
} from "@/lib/challenges/zone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KIND_PILLS: { value: ZoneActivityKind; emoji: string; label: string }[] = [
  { value: "zone-training", emoji: "🏃", label: "Zone training" },
  { value: "others", emoji: "🏋️", label: "Other workout" },
  { value: "recovery", emoji: "🧘", label: "Recovery" },
];

const ZONE_FIELDS = ["z2", "z3", "z4", "z5"] as const;

export function ZoneLogForm({
  challenge,
  uid,
  activities,
}: {
  challenge: Challenge;
  uid: string;
  activities: Activity[];
}) {
  const config = challenge.zoneConfig ?? DEFAULT_ZONE_CONFIG;
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ZoneActivityKind>("zone-training");
  const [date, setDate] = useState(localToday());
  const [zones, setZones] = useState({ z2: "", z3: "", z4: "", z5: "" });
  const [tier, setTier] = useState<OthersTier>("30");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function buildInput(): ZoneActivityInput & { date: string } {
    if (kind === "zone-training") {
      return {
        kind,
        date,
        zones: {
          z2: Number(zones.z2) || 0,
          z3: Number(zones.z3) || 0,
          z4: Number(zones.z4) || 0,
          z5: Number(zones.z5) || 0,
        },
      };
    }
    if (kind === "others") return { kind, date, tier };
    return { kind, date };
  }

  const previewPoints = zoneActivityPoints(buildInput(), config);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const input = buildInput();
    const parsed = zoneActivitySchema.safeParse(input);
    const validationError = firstError(parsed);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!isDateInChallengeWindow(input.date, challenge)) {
      setError(
        `The date must be between ${challenge.startDate} and ${challenge.endDate}.`
      );
      return;
    }
    if (
      input.kind === "recovery" &&
      recoveryUsedInWeek(activities, uid, input.date)
    ) {
      setError(
        "Recovery already logged this week — max one per calendar week. 🧘"
      );
      return;
    }

    setSubmitting(true);
    try {
      await logZoneActivity(input, challenge, uid);
      setZones({ z2: "", z3: "", z4: "", z5: "" });
      setOpen(false);
    } catch {
      setError("Could not save the activity. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="self-start">
        Log activity 🔥
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log your activity</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {KIND_PILLS.map((pill) => (
              <button
                key={pill.value}
                type="button"
                onClick={() => setKind(pill.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-3 text-sm font-medium transition-colors",
                  kind === pill.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-line bg-background-secondary text-muted hover:border-line-light"
                )}
              >
                <span className="text-xl">{pill.emoji}</span>
                {pill.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zoneDate">Date</Label>
            <Input
              id="zoneDate"
              type="date"
              value={date}
              min={challenge.startDate}
              max={challenge.endDate}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {kind === "zone-training" && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ZONE_FIELDS.map((zone) => (
                <div key={zone} className="flex flex-col gap-1.5">
                  <Label htmlFor={`zone-${zone}`} className="uppercase">
                    {zone} <span className="normal-case">min</span>
                  </Label>
                  <Input
                    id={`zone-${zone}`}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={zones[zone]}
                    onChange={(e) =>
                      setZones({ ...zones, [zone]: e.target.value })
                    }
                  />
                  <span className="text-xs text-faint">
                    ×{config.multipliers[zone]} pts/min
                  </span>
                </div>
              ))}
            </div>
          )}

          {kind === "others" && (
            <div className="flex flex-col gap-1.5">
              <Label>Duration</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["30", "60"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors",
                      tier === t
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-line bg-background-secondary text-muted hover:border-line-light"
                    )}
                  >
                    ≥{t} min ·{" "}
                    {t === "60"
                      ? config.othersPoints.sixtyMin
                      : config.othersPoints.thirtyMin}{" "}
                    pts
                  </button>
                ))}
              </div>
            </div>
          )}

          {kind === "recovery" && (
            <p className="text-sm text-muted">
              Yoga, stretching, sauna… {config.recoveryPoints} pts — max once
              per calendar week, and it counts toward your low-intensity
              80/20 ratio.
            </p>
          )}

          <p className="text-sm font-semibold text-primary-light">
            This entry earns {previewPoints.toLocaleString()} points
          </p>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Submit and get fit! 🔥"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
