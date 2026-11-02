import { z } from "zod";
import { z as z4 } from "zod/v4";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropicClient } from "@/lib/anthropic/client";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { ZoneMinutes } from "@/lib/challenges/zone";
import type { User } from "@/types";

export const ALLOWED_SCREENSHOT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
export type AllowedScreenshotType = (typeof ALLOWED_SCREENSHOT_TYPES)[number];

export function isAllowedScreenshotType(
  mediaType: string
): mediaType is AllowedScreenshotType {
  return (ALLOWED_SCREENSHOT_TYPES as readonly string[]).includes(mediaType);
}

// Netlify Functions cap a synchronous request body around 6MB; this
// leaves headroom for multipart overhead on top of the image itself.
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const MODEL = "claude-sonnet-5-5";

/**
 * Same Z2-Z5 model as mapStravaHeartrateZones (src/lib/strava/zones.ts):
 * Zone 1 (warmup/recovery) is dropped, Zones 2-5 map directly. Garmin,
 * Polar and Strava all use this same 5-zone heart-rate convention, so
 * one prompt covers any of them.
 */
const SYSTEM_PROMPT = `You read screenshots of fitness-tracker workout summaries (Garmin, Polar, Strava, or similar) and extract time spent per heart-rate zone.

Zones follow the standard 5-zone model: Zone 1 is warmup/recovery and must be ignored. Extract only Zone 2 (easy/aerobic) through Zone 5 (max/anaerobic), in minutes. Partial minutes are fine (e.g. 12:30 is 12.5).

If the screenshot doesn't show a heart-rate zone breakdown at all, set found to false and all zone values to 0.`;

// The JSON shape the API is constrained to return (structured outputs).
// Plain numbers on purpose: range limits aren't something structured
// outputs promises to enforce, so they're checked client-side by
// outputSchema below. Uses zod/v4 because the SDK helper is typed against
// it; the rest of the project is on the zod v3 API.
const ZONES_OUTPUT_FORMAT = betaZodOutputFormat(
  z4.object({
    found: z4.boolean(),
    z2: z4.number(),
    z3: z4.number(),
    z4: z4.number(),
    z5: z4.number(),
  })
);

const zoneMinutesSchema = z.number().min(0).max(600);

const outputSchema = z.object({
  found: z.boolean(),
  z2: zoneMinutesSchema,
  z3: zoneMinutesSchema,
  z4: zoneMinutesSchema,
  z5: zoneMinutesSchema,
});

export interface ZoneScreenshotResult {
  found: boolean;
  zones: ZoneMinutes;
}

const DAILY_SCAN_LIMIT = 20;

/**
 * Defense-in-depth cost guard: registration is open (CLAUDE.md), so
 * "any signed-in user" doesn't actually bound who can trigger this paid
 * API call — the real ceiling is a spend limit set on the Anthropic key
 * itself (console-side, not code). This just adds friction on top of
 * that. A transaction, not a plain read-then-write, so two concurrent
 * scans can't both read count 19 and both land on 20.
 */
export async function checkAndIncrementScanLimit(uid: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const userRef = adminDb().collection(COLLECTIONS.users).doc(uid);

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const current = (snap.data() as User | undefined)?.screenshotScans;
    const count = current?.date === today ? current.count : 0;
    if (count >= DAILY_SCAN_LIMIT) return false;
    tx.set(userRef, { screenshotScans: { date: today, count: count + 1 } }, { merge: true });
    return true;
  });
}

/**
 * Validates and reshapes the model's structured output. Separated from the
 * network call below so it's unit-testable without mocking the SDK —
 * same split as fetchStravaActivity's 404-vs-throw boundary.
 */
export function parseZoneScreenshotOutput(output: unknown): ZoneScreenshotResult {
  const parsed = outputSchema.parse(output);
  return {
    found: parsed.found,
    zones: { z2: parsed.z2, z3: parsed.z3, z4: parsed.z4, z5: parsed.z5 },
  };
}

/**
 * Sends a screenshot to Claude's vision API and returns the zone minutes
 * it reads off it. Never persists the image anywhere — it's forwarded
 * in-memory and discarded once this call returns.
 */
export async function parseZoneScreenshot(
  imageBase64: string,
  mediaType: AllowedScreenshotType
): Promise<ZoneScreenshotResult> {
  // Structured outputs, not a forced tool call: Claude Sonnet 5.5 rejects
  // tool_choice {type: "tool"} with a 400. Low effort keeps latency down
  // for a simple read; max_tokens leaves room for its (always-on)
  // adaptive thinking, which counts against the limit. `fallbacks:
  // "default"` reroutes a policy decline to another model inside the same
  // call instead of failing the scan.
  const message = await anthropicClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 4096,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: ZONES_OUTPUT_FORMAT },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
        ],
      },
    ],
  });

  if (message.stop_reason === "refusal") {
    throw new Error("Screenshot scan was declined");
  }
  if (message.parsed_output == null) {
    // e.g. stop_reason max_tokens: no complete JSON to parse
    throw new Error(`No structured output (stop_reason: ${message.stop_reason})`);
  }
  return parseZoneScreenshotOutput(message.parsed_output);
}
