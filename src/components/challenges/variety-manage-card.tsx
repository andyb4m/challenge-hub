"use client";

import { useState } from "react";
import type { Challenge, VarietyKindConfig } from "@/types";
import { updateVarietyKinds } from "@/lib/challenges/service";
import { varietyConfigSchema } from "@/lib/challenges/validation";
import { firstError } from "@/lib/auth/validation";
import { varietyKinds } from "@/lib/challenges/variety";
import { VarietyKindsEditor } from "@/components/challenges/variety-kinds-editor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Creator-only: edit the challenge's activity list after creation. */
export function VarietyManageCard({ challenge }: { challenge: Challenge }) {
  const [open, setOpen] = useState(false);
  const [kinds, setKinds] = useState<VarietyKindConfig[]>(() =>
    varietyKinds(challenge)
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
          setKinds(varietyKinds(challenge)); // re-sync with the live doc
          setOpen(true);
        }}
      >
        Edit activities
      </Button>
    );
  }

  async function handleSave() {
    const trimmed = kinds.map((k) => ({ ...k, label: k.label.trim() }));
    const parsed = varietyConfigSchema.safeParse({ kinds: trimmed });
    const validationError = firstError(parsed);
    if (validationError) {
      setStatus({ kind: "error", message: validationError });
      return;
    }

    setStatus({ kind: "saving" });
    try {
      await updateVarietyKinds(challenge.id, trimmed);
      setStatus({ kind: "idle" });
      setOpen(false);
    } catch {
      setStatus({
        kind: "error",
        message: "Could not save the activity list. Please try again.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit activities</CardTitle>
        <CardDescription>
          Rename, add or remove activities and set how often each counts.
          Changes apply to everyone immediately — removed kinds stop
          scoring, lowered counts clamp retroactively.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <VarietyKindsEditor kinds={kinds} onChange={setKinds} />

        {status.kind === "error" && (
          <p role="alert" className="text-sm text-error">
            {status.message}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={status.kind === "saving"}>
            {status.kind === "saving" ? "Saving…" : "Save list"}
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
