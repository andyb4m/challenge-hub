"use client";

import { useState } from "react";
import type { VarietyKindConfig } from "@/types";
import { defaultVarietyKinds, makeKindId } from "@/lib/challenges/variety";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Creator-facing editor for a variety challenge's activity list:
 * rename, remove, add, and set how often each kind counts.
 */
export function VarietyKindsEditor({
  kinds,
  onChange,
}: {
  kinds: VarietyKindConfig[];
  onChange: (kinds: VarietyKindConfig[]) => void;
}) {
  const [newLabel, setNewLabel] = useState("");

  function updateKind(id: string, patch: Partial<VarietyKindConfig>) {
    onChange(kinds.map((k) => (k.id === id ? { ...k, ...patch } : k)));
  }

  function removeKind(id: string) {
    onChange(kinds.filter((k) => k.id !== id));
  }

  function addKind() {
    const label = newLabel.trim();
    if (!label) return;
    onChange([
      ...kinds,
      {
        id: makeKindId(label, kinds.map((k) => k.id)),
        label,
        maxCount: 1,
      },
    ]);
    setNewLabel("");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label>Activities ({kinds.length})</Label>
        <button
          type="button"
          className="text-xs text-muted underline hover:text-foreground"
          onClick={() => onChange(defaultVarietyKinds())}
        >
          Reset to default list
        </button>
      </div>

      <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-md border border-line bg-background-secondary/50 p-2">
        {kinds.map((kind) => (
          <div key={kind.id} className="flex items-center gap-2">
            <Input
              aria-label={`Name for ${kind.label}`}
              className="h-8 flex-1 text-sm"
              value={kind.label}
              onChange={(e) => updateKind(kind.id, { label: e.target.value })}
            />
            <div className="flex items-center gap-1" title="How often this activity counts">
              <span className="text-xs text-faint">×</span>
              <Input
                aria-label={`How often ${kind.label} counts`}
                type="number"
                min="1"
                max="99"
                step="1"
                className="h-8 w-14 text-center text-sm"
                value={kind.maxCount}
                onChange={(e) =>
                  updateKind(kind.id, {
                    maxCount: Math.max(1, Math.floor(Number(e.target.value)) || 1),
                  })
                }
              />
            </div>
            <button
              type="button"
              aria-label={`Remove ${kind.label}`}
              className="rounded px-1.5 py-1 text-sm text-muted hover:bg-error/10 hover:text-error"
              onClick={() => removeKind(kind.id)}
            >
              ✕
            </button>
          </div>
        ))}
        {kinds.length === 0 && (
          <p className="p-2 text-sm text-muted">
            No activities yet — add some below or reset to the default list.
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add an activity… (e.g. 🏇 Horse riding)"
          className="h-9 text-sm"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addKind();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          onClick={addKind}
          disabled={!newLabel.trim()}
        >
          Add
        </Button>
      </div>
      <p className="text-xs text-faint">
        ×N = how many activities of that kind score. Removing a kind stops it
        scoring (already-logged entries stay in the feed).
      </p>
    </div>
  );
}
