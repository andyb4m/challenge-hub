import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { isAdminEmail } from "@/lib/admin/access";
import type { Activity, Challenge, User } from "@/types";
import type { RecentActivity } from "@/lib/challenges/service";

/** Admin-only: one user's profile + their full activity history across every challenge. */
export async function GET(
  request: Request,
  { params }: { params: { uid: string } }
) {
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
  const userSnap = await db.collection(COLLECTIONS.users).doc(params.uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  const user = userSnap.data() as User;

  const challengeIds = user.challengeIds ?? [];
  const challengeSnaps = await Promise.all(
    challengeIds.map((id) => db.collection(COLLECTIONS.challenges).doc(id).get())
  );
  const challenges = challengeSnaps
    .filter((s) => s.exists)
    .map((s) => ({ id: s.id, ...s.data() }) as Challenge);

  const perChallengeActivities = await Promise.all(
    challenges.map(async (challenge) => {
      const snap = await db
        .collection(COLLECTIONS.activities(challenge.id))
        .where("uid", "==", params.uid)
        .get();
      return snap.docs.map((d) => {
        const activity = d.data() as Activity;
        return {
          id: d.id,
          challengeId: challenge.id,
          challengeName: challenge.name,
          name: activity.name,
          startDate: activity.startDate,
          source: activity.source,
          stravaActivityId: activity.stravaActivityId,
        } satisfies RecentActivity;
      });
    })
  );

  const activities = perChallengeActivities
    .flat()
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  return NextResponse.json({
    user: {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      createdAt: user.createdAt,
      stravaConnected: user.strava !== null,
      challengeCount: challengeIds.length,
    },
    activities,
  });
}
