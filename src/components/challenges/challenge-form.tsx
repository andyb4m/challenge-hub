"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CreateChallengeInput, SportType, ChallengeGoalUnit } from "@/types";
import { createChallenge } from "@/lib/challenges/service";
import {
  createChallengeSchema,
  GOAL_UNIT_LABELS,
  GOAL_UNITS,
  SPORT_TYPES,
} from "@/lib/challenges/validation";
import { firstError } from "@/lib/auth/validation";
import { localToday } from "@/lib/challenges/scoring";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ChallengeForm() {
  const router = useRouter();
  const { profile } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sportType, setSportType] = useState<SportType>("Run");
  const [goalValue, setGoalValue] = useState("");
  const [goalUnit, setGoalUnit] = useState<ChallengeGoalUnit>("distance_km");
  const [startDate, setStartDate] = useState(localToday());
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profile) return;

    const input: CreateChallengeInput = {
      name,
      description,
      sportType,
      goal: { value: Number(goalValue), unit: goalUnit },
      startDate,
      endDate,
    };

    const parsed = createChallengeSchema.safeParse(input);
    const validationError = firstError(parsed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const challengeId = await createChallenge(input, profile);
      router.push(`/challenges/${challengeId}`);
    } catch {
      setError("Could not create the challenge. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New challenge</CardTitle>
        <CardDescription>
          Set the sport, the goal, and the time window — then share the invite
          link with your friends.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="June running challenge"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Loser buys the beers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sportType">Sport</Label>
            <Select
              id="sportType"
              value={sportType}
              onChange={(e) => setSportType(e.target.value as SportType)}
            >
              {SPORT_TYPES.map((sport) => (
                <option key={sport} value={sport}>
                  {sport === "WeightTraining" ? "Weight training" : sport}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goalValue">Goal</Label>
              <Input
                id="goalValue"
                type="number"
                step="any"
                min="0"
                placeholder="100"
                value={goalValue}
                onChange={(e) => setGoalValue(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goalUnit">Measured in</Label>
              <Select
                id="goalUnit"
                value={goalUnit}
                onChange={(e) =>
                  setGoalUnit(e.target.value as ChallengeGoalUnit)
                }
              >
                {GOAL_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {GOAL_UNIT_LABELS[unit]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Starts</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">Ends</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" className="self-start" disabled={submitting}>
            {submitting ? "Creating…" : "Create challenge"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
