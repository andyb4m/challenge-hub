"use client";

import { useState, type FormEvent } from "react";
import type { Challenge } from "@/types";
import { logManualActivity } from "@/lib/challenges/service";
import {
  manualActivitySchema,
  isDateInChallengeWindow,
} from "@/lib/challenges/validation";
import { firstError } from "@/lib/auth/validation";
import { localToday } from "@/lib/challenges/scoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LogActivityForm({
  challenge,
  uid,
}: {
  challenge: Challenge;
  uid: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(localToday());
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isDistanceSport = ["Run", "Ride", "Swim", "Walk", "Hike"].includes(
    challenge.sportType
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const input = {
      name: name || `${challenge.sportType} activity`,
      date,
      distanceKm: isDistanceSport ? Number(distanceKm) : 0,
      durationMinutes: Number(durationMinutes),
    };

    const parsed = manualActivitySchema.safeParse(input);
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

    setSubmitting(true);
    try {
      await logManualActivity(input, challenge, uid);
      setName("");
      setDistanceKm("");
      setDurationMinutes("");
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
        Log activity
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a {challenge.sportType} activity</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activityName">Name</Label>
            <Input
              id="activityName"
              placeholder={`${challenge.sportType} activity`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="activityDate">Date</Label>
              <Input
                id="activityDate"
                type="date"
                value={date}
                min={challenge.startDate}
                max={challenge.endDate}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            {isDistanceSport && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="activityDistance">Distance (km)</Label>
                <Input
                  id="activityDistance"
                  type="number"
                  step="0.1"
                  min="0"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="activityDuration">Duration (min)</Label>
              <Input
                id="activityDuration"
                type="number"
                step="1"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save activity"}
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
