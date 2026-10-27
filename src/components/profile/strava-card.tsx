"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "@/types";
import { disconnectStrava, updateMaxHeartRate } from "@/lib/auth/service";
import { firstError, maxHeartRateSchema } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StravaCard({
  user,
  profile,
}: {
  user: FirebaseUser;
  profile: User;
}) {
  const connectFailed = useSearchParams().get("strava") === "error";
  const [error, setError] = useState<string | null>(
    connectFailed ? "Could not connect Strava. Please try again." : null
  );
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const stravaConfigured = Boolean(process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID);

  const [maxHeartRateInput, setMaxHeartRateInput] = useState(
    profile.maxHeartRate != null ? String(profile.maxHeartRate) : ""
  );
  const [hrStatus, setHrStatus] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/strava/connect", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) throw new Error("failed");
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setError("Could not start the Strava connection. Please try again.");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setDisconnecting(true);
    try {
      await disconnectStrava(profile.uid);
    } catch {
      setError("Could not disconnect Strava. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSaveMaxHeartRate(e: FormEvent) {
    e.preventDefault();

    if (maxHeartRateInput.trim() === "") {
      setHrStatus({ kind: "saving" });
      try {
        await updateMaxHeartRate(profile.uid, null);
        setHrStatus({ kind: "saved" });
      } catch {
        setHrStatus({ kind: "error", message: "Could not save. Please try again." });
      }
      return;
    }

    const parsed = maxHeartRateSchema.safeParse(Number(maxHeartRateInput));
    const validationError = firstError(parsed);
    if (validationError) {
      setHrStatus({ kind: "error", message: validationError });
      return;
    }

    setHrStatus({ kind: "saving" });
    try {
      await updateMaxHeartRate(profile.uid, parsed.data!);
      setHrStatus({ kind: "saved" });
    } catch {
      setHrStatus({ kind: "error", message: "Could not save. Please try again." });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strava</CardTitle>
        <CardDescription>
          Connect Strava so your activities count towards challenges
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {profile.strava ? (
          <>
            <p className="text-sm text-muted">
              Connected as athlete{" "}
              <span className="font-medium">#{profile.strava.athleteId}</span>{" "}
              since{" "}
              {new Date(profile.strava.connectedAt).toLocaleDateString()}.
            </p>
            <Button
              variant="outline"
              className="self-start"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect Strava"}
            </Button>
          </>
        ) : stravaConfigured ? (
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="self-start bg-none bg-[#FC4C02] text-white hover:bg-[#e04502]"
          >
            {connecting ? "Connecting…" : "Connect with Strava"}
          </Button>
        ) : (
          <p className="text-sm text-muted">
            Strava connection isn&apos;t available yet — API credentials
            haven&apos;t been configured.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <div className="mt-2 flex flex-col gap-1.5 border-t border-line pt-4">
          <Label htmlFor="maxHeartRate">Max heart rate (bpm)</Label>
          <p className="text-xs text-muted">
            Needed for zone challenges to compute your training zones from
            Strava — same %-of-max-HR model as a Garmin zone chart. Without
            it, your Strava activities are skipped for zone challenges.
          </p>
          <form onSubmit={handleSaveMaxHeartRate} className="flex gap-2">
            <Input
              id="maxHeartRate"
              type="number"
              inputMode="numeric"
              placeholder="e.g. 192"
              className="max-w-[140px]"
              value={maxHeartRateInput}
              onChange={(e) => setMaxHeartRateInput(e.target.value)}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={hrStatus.kind === "saving"}
            >
              {hrStatus.kind === "saving" ? "Saving…" : "Save"}
            </Button>
          </form>
          {hrStatus.kind === "saved" && (
            <p className="text-xs text-success">Saved.</p>
          )}
          {hrStatus.kind === "error" && (
            <p role="alert" className="text-xs text-error">
              {hrStatus.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
