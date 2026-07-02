"use client";

import { useState } from "react";
import type { User } from "@/types";
import { buildStravaAuthUrl } from "@/lib/strava/oauth";
import { disconnectStrava } from "@/lib/auth/service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StravaCard({ profile }: { profile: User }) {
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const stravaConfigured = Boolean(process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID);

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
          <a href={buildStravaAuthUrl(profile.uid)} className="self-start">
            {/* bg-none clears the default gradient so Strava brand orange shows */}
            <Button className="bg-none bg-[#FC4C02] text-white hover:bg-[#e04502]">
              Connect with Strava
            </Button>
          </a>
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
      </CardContent>
    </Card>
  );
}
