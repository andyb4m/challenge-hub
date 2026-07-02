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
import {
  kindAlreadyCounted,
  VARIETY_KINDS,
} from "@/lib/challenges/variety";
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
  const [open, setOpen] = useState(false);
  const [kindId, setKindId] = useState(VARIETY_KINDS[0].id);
  const [date, setDate] = useState(localToday());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const alreadyCounted = kindAlreadyCounted(member, kindId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const input = { kindId, date };
    const parsed = varietyActivitySchema.safeParse(input);
    const validationError = firstError(parsed);
    if (validationError) {
      setError(validationError);
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
      await logVarietyActivity(input, challenge.id, member.uid);
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
              {VARIETY_KINDS.map((kind) => (
                <option key={kind.id} value={kind.id}>
                  {kind.emoji} {kind.label}
                  {kindAlreadyCounted(member, kind.id) ? " ✓" : ""}
                </option>
              ))}
            </Select>
            {alreadyCounted && (
              <p className="text-xs text-warning">
                Already counted — logging it again won&apos;t add to your
                score.
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
