import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import {
  checkAndIncrementScanLimit,
  isAllowedScreenshotType,
  MAX_SCREENSHOT_BYTES,
  parseZoneScreenshot,
} from "@/lib/challenges/zone-screenshot";

/**
 * Parses a fitness-tracker screenshot into zone-training minutes via
 * Claude's vision API. Requires auth (any signed-in user — this has no
 * per-challenge data to authorize against, it's a stateless read) purely
 * to keep the API key from being abusable by anonymous traffic. Since
 * registration is open, "any signed-in user" doesn't bound this much on
 * its own, hence the per-uid daily limit below — see
 * checkAndIncrementScanLimit's doc comment. The image is held in memory
 * for the single Anthropic call and never written to Firestore, Storage,
 * or a log.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  let uid: string;
  try {
    ({ uid } = await adminAuth().verifyIdToken(idToken));
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing-image" }, { status: 400 });
  }
  if (!isAllowedScreenshotType(file.type)) {
    return NextResponse.json({ error: "unsupported-type" }, { status: 400 });
  }
  if (file.size > MAX_SCREENSHOT_BYTES) {
    return NextResponse.json({ error: "too-large" }, { status: 400 });
  }

  // Checked only once the upload itself is valid, so a mis-picked file
  // doesn't cost the user one of their daily scans.
  if (!(await checkAndIncrementScanLimit(uid))) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await parseZoneScreenshot(buffer.toString("base64"), file.type);
    return NextResponse.json(result);
  } catch (err) {
    console.error("parseZoneScreenshot failed:", err);
    return NextResponse.json({ error: "parse-failed" }, { status: 502 });
  }
}
