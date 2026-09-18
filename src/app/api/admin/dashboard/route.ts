import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { isAdminEmail } from "@/lib/admin/access";
import { buildAdminDashboard } from "@/lib/admin/stats";
import { localToday } from "@/lib/challenges/scoring";
import type { Activity, Challenge, User } from "@/types";

/** Activity docs never store an `id` field internally — only these do. */
type ActivityForStats = Pick<Activity, "uid" | "source" | "startDate">;

/**
 * The one cross-user, cross-challenge read in the app. Admin-only (see
 * src/lib/admin/access.ts) — the Admin SDK bypasses firestore.rules
 * entirely, so this route is the actual security boundary, not the
 * /admin page that calls it. No firestore.rules change was made or
 * needed for this feature.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let email: string | undefined;
  try {
    ({ email } = await adminAuth().verifyIdToken(idToken));
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = adminDb();
  const [usersSnap, challengesSnap] = await Promise.all([
    db.collection(COLLECTIONS.users).get(),
    db.collection(COLLECTIONS.challenges).get(),
  ]);

  const users = usersSnap.docs.map((d) => d.data() as User);
  const challenges = challengesSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Challenge
  );

  const activitiesByChallenge = new Map<string, ActivityForStats[]>();
  await Promise.all(
    challenges.map(async (challenge) => {
      const snap = await db
        .collection(COLLECTIONS.activities(challenge.id))
        .get();
      activitiesByChallenge.set(
        challenge.id,
        snap.docs.map((d) => d.data() as ActivityForStats)
      );
    })
  );

  const { stats, userSummaries } = buildAdminDashboard(
    users,
    challenges,
    activitiesByChallenge,
    localToday()
  );

  return NextResponse.json({ stats, users: userSummaries });
}
