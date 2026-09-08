"use client";

import type { ZoneConfig } from "@/types";
import { DEFAULT_ZONE_CONFIG } from "@/lib/challenges/zone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Creator-facing editor for a zone challenge's scoring rules: multipliers,
 * "Others"/recovery points, and the low-intensity bonus band.
 */
export function ZoneConfigEditor({
  config,
  onChange,
}: {
  config: ZoneConfig;
  onChange: (config: ZoneConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <Label>Zone rules</Label>
        <button
          type="button"
          className="text-xs text-muted underline hover:text-foreground"
          onClick={() => onChange(DEFAULT_ZONE_CONFIG)}
        >
          Reset to defaults
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-faint">
          Points per minute in each heart-rate zone
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["z2", "z3", "z4", "z5"] as const).map((zone) => (
            <div key={zone} className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted uppercase">
                {zone}
              </span>
              <Input
                aria-label={`${zone.toUpperCase()} multiplier`}
                type="number"
                step="0.1"
                min="0"
                max="5"
                className="h-8 text-sm"
                value={config.multipliers[zone]}
                onChange={(e) =>
                  onChange({
                    ...config,
                    multipliers: {
                      ...config.multipliers,
                      [zone]: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-faint">
          &quot;Others&quot; workouts — flat points by duration
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-xs text-muted">
              ≥30 min
            </span>
            <Input
              aria-label="Points for a 30+ minute Others workout"
              type="number"
              step="1"
              min="0"
              max="500"
              className="h-8 text-sm"
              value={config.othersPoints.thirtyMin}
              onChange={(e) =>
                onChange({
                  ...config,
                  othersPoints: {
                    ...config.othersPoints,
                    thirtyMin: Number(e.target.value),
                  },
                })
              }
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-xs text-muted">
              ≥60 min
            </span>
            <Input
              aria-label="Points for a 60+ minute Others workout"
              type="number"
              step="1"
              min="0"
              max="500"
              className="h-8 text-sm"
              value={config.othersPoints.sixtyMin}
              onChange={(e) =>
                onChange({
                  ...config,
                  othersPoints: {
                    ...config.othersPoints,
                    sixtyMin: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-faint">
          Recovery (yoga, sauna…) — max once per calendar week
        </p>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-xs text-muted">
            Points
          </span>
          <Input
            aria-label="Points per recovery activity"
            type="number"
            step="1"
            min="0"
            max="500"
            className="h-8 w-24 text-sm"
            value={config.recoveryPoints}
            onChange={(e) =>
              onChange({ ...config, recoveryPoints: Number(e.target.value) })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-faint">
          Low-intensity bonus: multiplies total points when the low-share
          of training falls in this range
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            aria-label="Bonus band low percentage"
            type="number"
            step="1"
            min="0"
            max="100"
            className="h-8 w-16 text-sm"
            value={Math.round(config.bonus.low * 100)}
            onChange={(e) =>
              onChange({
                ...config,
                bonus: { ...config.bonus, low: Number(e.target.value) / 100 },
              })
            }
          />
          <span className="text-xs text-muted">% to</span>
          <Input
            aria-label="Bonus band high percentage"
            type="number"
            step="1"
            min="0"
            max="100"
            className="h-8 w-16 text-sm"
            value={Math.round(config.bonus.high * 100)}
            onChange={(e) =>
              onChange({
                ...config,
                bonus: {
                  ...config.bonus,
                  high: Number(e.target.value) / 100,
                },
              })
            }
          />
          <span className="text-xs text-muted">% → ×</span>
          <Input
            aria-label="Bonus multiplier"
            type="number"
            step="0.05"
            min="1"
            max="3"
            className="h-8 w-20 text-sm"
            value={config.bonus.multiplier}
            onChange={(e) =>
              onChange({
                ...config,
                bonus: {
                  ...config.bonus,
                  multiplier: Number(e.target.value),
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
