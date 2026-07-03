"use client";

import { useState, type FormEvent } from "react";
import type { Challenge, ChallengeMember } from "@/types";
import { logVarietyActivity } from "@/lib/challenges/service";
import {
  varietyActivitySchema,
  isDateInChallengeWindow,
} from "@/lib/challenges/validation";
import { firstError } from "@/lib/auth/validation";
import { localToday } from "@/lib/challenges/scoring";
import { kindCountFor, varietyKinds } from "@/lib/challenges/variety";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VarietyLogForm({
  challenge,
  member,
}: {
  challenge: Challenge;
  member: ChallengeMember;
}) {
  const kinds = varietyKinds(challenge);
  const [open, setOpen] = useState(false);
  const [kindId, setKindId] = useState(kinds[0]?.id ?? "");
  const [date, setDate] = useState(localToday());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = kinds.find((k) => k.id === kindId);
  const count = kindCountFor(member, kindId);
  const maxed = selected !== undefined && count >= selected.maxCount;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = varietyActivitySchema.safeParse({ kindId, date });
    const validationError = firstError(parsed);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!selected) {
      setError("Pick an activity from the list.");
      return;
    }
    if (!isDateInChallengeWindow(date, challenge)) {
      setError(
        `The date must be between ${challenge.startDate} and ${challenge.endDate}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await logVarietyActivity(
        { kindId, label: selected.label, date },
        challenge.id,
        member.uid
      );
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
        Log activity 🌈
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log an activity</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="varietyKind">Activity</Label>
            <Select
              id="varietyKind"
              value={kindId}
              onChange={(e) => setKindId(e.target.value)}
            >
              {kinds.map((kind) => {
                const c = kindCountFor(member, kind.id);
                return (
                  <option key={kind.id} value={kind.id}>
                    {kind.label}
                    {kind.maxCount > 1 || c > 0
                      ? ` (${Math.min(c, kind.maxCount)}/${kind.maxCount})`
                      : ""}
                    {c >= kind.maxCount ? " ✓" : ""}
                  </option>
                );
              })}
            </Select>
            {selected && maxed && (
              <p className="text-xs text-warning">
                Already fully counted ({selected.maxCount}×) — logging it
                again won&apos;t add to your score.
              </p>
            )}
            {selected && !maxed && selected.maxCount > 1 && (
              <p className="text-xs text-muted">
                Counted {count}/{selected.maxCount} so far.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="varietyDate">Date</Label>
            <Input
              id="varietyDate"
              type="date"
              value={date}
              min={challenge.startDate}
              max={challenge.endDate}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Count it! 🌈"}
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
