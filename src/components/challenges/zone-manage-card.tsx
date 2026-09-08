"use client";

import { useState } from "react";
import type { Challenge, ZoneConfig } from "@/types";
import { updateZoneConfig } from "@/lib/challenges/service";
import { zoneConfigSchema } from "@/lib/challenges/validation";
import { firstError } from "@/lib/auth/validation";
import { DEFAULT_ZONE_CONFIG } from "@/lib/challenges/zone";
import { ZoneConfigEditor } from "@/components/challenges/zone-config-editor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Creator-only: edit the challenge's zone scoring rules after creation. */
export function ZoneManageCard({ challenge }: { challenge: Challenge }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<ZoneConfig>(
    () => challenge.zoneConfig ?? DEFAULT_ZONE_CONFIG
  );
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setConfig(challenge.zoneConfig ?? DEFAULT_ZONE_CONFIG); // re-sync with the live doc
          setOpen(true);
        }}
      >
        Edit zone rules
      </Button>
    );
  }

  async function handleSave() {
    const parsed = zoneConfigSchema.safeParse(config);
    const validationError = firstError(parsed);
    if (validationError) {
      setStatus({ kind: "error", message: validationError });
      return;
    }

    setStatus({ kind: "saving" });
    try {
      await updateZoneConfig(challenge.id, config);
      setStatus({ kind: "idle" });
      setOpen(false);
    } catch {
      setStatus({
        kind: "error",
        message: "Could not save the zone rules. Please try again.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit zone rules</CardTitle>
        <CardDescription>
          Multiplier, Others, and Recovery changes only apply to activities
          logged after you save — already-logged entries keep their points.
          The bonus band and multiplier apply live, so changing those
          updates everyone&apos;s final score right away.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ZoneConfigEditor config={config} onChange={setConfig} />

        {status.kind === "error" && (
          <p role="alert" className="text-sm text-error">
            {status.message}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={status.kind === "saving"}>
            {status.kind === "saving" ? "Saving…" : "Save rules"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={status.kind === "saving"}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
