"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "@/types";
import { disconnectStrava } from "@/lib/auth/service";
import { Button } from "@/components/ui/button";
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
      </CardContent>
    </Card>
  );
}
