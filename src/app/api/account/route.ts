import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * GDPR right-to-erasure: deletes the caller's own member docs and
 * activities from every challenge they belong to, their user doc, and
 * their Firebase Auth account. Runs server-side (Admin SDK) so it isn't
 * blocked by Firebase Auth's "recent login" requirement for client-side
 * account deletion. Identity comes from the verified ID token, never a
 * body param, so a caller can only ever delete their own account.
 *
 * Challenges the user *created* are left in place for their other
 * members — only this user's own data is removed. `createdBy` still
 * points at the deleted uid afterward, which simply means no one can
 * edit/delete that challenge again (the rules check requires a match);
 * an acceptable tradeoff over cascading the deletion to everyone else's
 * data in a shared challenge.
 */
export async function DELETE(request: Request) {
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

  const db = adminDb();
  const userRef = db.collection(COLLECTIONS.users).doc(uid);
  const userSnap = await userRef.get();
  const challengeIds: string[] = userSnap.exists
    ? (userSnap.data()?.challengeIds ?? [])
    : [];

  for (const challengeId of challengeIds) {
    const batch = db.batch();

    batch.delete(db.doc(`${COLLECTIONS.members(challengeId)}/${uid}`));
    batch.update(db.collection(COLLECTIONS.challenges).doc(challengeId), {
      memberCount: FieldValue.increment(-1),
    });

    const activities = await db
      .collection(COLLECTIONS.activities(challengeId))
      .where("uid", "==", uid)
      .get();
    activities.docs.forEach((activityDoc) => batch.delete(activityDoc.ref));

    await batch.commit();
  }

  await userRef.delete();
  await adminAuth().deleteUser(uid);

  return NextResponse.json({ ok: true });
}
