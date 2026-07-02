"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type {
  CreateChallengeInput,
  SportType,
  ChallengeGoalUnit,
  ChallengeScoring,
} from "@/types";
import { createChallenge } from "@/lib/challenges/service";
import {
  createChallengeSchema,
  GOAL_UNIT_LABELS,
  GOAL_UNITS,
  SPORT_TYPES,
} from "@/lib/challenges/validation";
import { firstError } from "@/lib/auth/validation";
import { localToday } from "@/lib/challenges/scoring";
import { VARIETY_KINDS } from "@/lib/challenges/variety";
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
import { cn } from "@/lib/utils";

const SCORING_OPTIONS: {
  value: ChallengeScoring;
  emoji: string;
  label: string;
  blurb: string;
}[] = [
  {
    value: "goal",
    emoji: "🎯",
    label: "Goal",
    blurb: "One sport, race to a target — km, minutes or activity count",
  },
  {
    value: "zone",
    emoji: "❤️‍🔥",
    label: "Zone points",
    blurb: "HR-zone minutes earn points; smart 80/20 training gets a bonus",
  },
  {
    value: "variety",
    emoji: "🌈",
    label: "Variety",
    blurb: `Most different sports wins — each of ${VARIETY_KINDS.length} kinds counts once`,
  },
];

export function ChallengeForm() {
  const router = useRouter();
  const { profile } = useAuth();
  const [scoring, setScoring] = useState<ChallengeScoring>("goal");
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

    const isGoal = scoring === "goal";
    const input: CreateChallengeInput = {
      name,
      description,
      scoring,
      sportType: isGoal ? sportType : null,
      goal: isGoal ? { value: Number(goalValue), unit: goalUnit } : null,
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
          Pick a format, set the time window — then share the invite link
          with your friends.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Challenge type</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {SCORING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScoring(option.value)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-colors",
                    scoring === option.value
                      ? "border-primary bg-primary/10"
                      : "border-line bg-background-secondary hover:border-line-light"
                  )}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {option.emoji} {option.label}
                  </span>
                  <span className="text-xs text-muted">{option.blurb}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder={
                scoring === "zone"
                  ? "SummerFit 2027"
                  : scoring === "variety"
                    ? "Try everything August"
                    : "June running challenge"
              }
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

          {scoring === "goal" && (
            <>
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
            </>
          )}

          {scoring === "zone" && (
            <div className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
              <p className="font-semibold">How zone scoring works</p>
              <ul className="mt-1 list-inside list-disc text-info/90">
                <li>Zone training: Z2 ×1.0 · Z3 ×0.5 · Z4 ×1.5 · Z5 ×2.0 points per minute</li>
                <li>Other workouts: 20 pts (≥30 min) or 40 pts (≥60 min)</li>
                <li>Recovery (yoga, sauna…): 30 pts, max once per week</li>
                <li>80/20 bonus: keep 70–85% of your training low-intensity → all points ×1.15 ⭐</li>
              </ul>
            </div>
          )}

          {scoring === "variety" && (
            <div className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
              <p className="font-semibold">How variety scoring works</p>
              <p className="mt-1 text-info/90">
                Log activities from a catalog of {VARIETY_KINDS.length} sports —
                from gym to slacklining to fly fishing. Each kind counts once;
                whoever collects the most different kinds wins.
              </p>
            </div>
          )}

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
            <p role="alert" className="text-sm text-error">
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
