import { z } from "zod";
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

const EXTRACT_ZONES_TOOL = "extracted_zone_minutes";

/**
 * Same Z2-Z5 model as mapStravaHeartrateZones (src/lib/strava/zones.ts):
 * Zone 1 (warmup/recovery) is dropped, Zones 2-5 map directly. Garmin,
 * Polar and Strava all use this same 5-zone heart-rate convention, so
 * one prompt covers any of them.
 */
const SYSTEM_PROMPT = `You read screenshots of fitness-tracker workout summaries (Garmin, Polar, Strava, or similar) and extract time spent per heart-rate zone.

Zones follow the standard 5-zone model: Zone 1 is warmup/recovery and must be ignored. Extract only Zone 2 (easy/aerobic) through Zone 5 (max/anaerobic), in minutes. Partial minutes are fine (e.g. 12:30 is 12.5).

Always call the ${EXTRACT_ZONES_TOOL} tool exactly once. If the screenshot doesn't show a heart-rate zone breakdown at all, set found to false and all zone values to 0.`;

const zoneMinutesSchema = z.number().min(0).max(600);

const toolResponseSchema = z.object({
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
 * Validates and reshapes the model's tool_use input. Separated from the
 * network call below so it's unit-testable without mocking the SDK —
 * same split as fetchStravaActivity's 404-vs-throw boundary.
 */
export function parseZoneScreenshotToolResponse(input: unknown): ZoneScreenshotResult {
  const parsed = toolResponseSchema.parse(input);
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
  const message = await anthropicClient().messages.create({
    model: MODEL,
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    tool_choice: { type: "tool", name: EXTRACT_ZONES_TOOL },
    tools: [
      {
        name: EXTRACT_ZONES_TOOL,
        description: "The workout's heart-rate zone training time read from the screenshot.",
        input_schema: {
          type: "object",
          properties: {
            found: {
              type: "boolean",
              description: "true if this screenshot shows a heart-rate zone time breakdown",
            },
            z2: { type: "number", description: "Minutes in Zone 2" },
            z3: { type: "number", description: "Minutes in Zone 3" },
            z4: { type: "number", description: "Minutes in Zone 4" },
            z5: { type: "number", description: "Minutes in Zone 5" },
          },
          required: ["found", "z2", "z3", "z4", "z5"],
        },
      },
    ],
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

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return the expected tool call");
  }

  return parseZoneScreenshotToolResponse(toolUse.input);
}
