import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";

/**
 * Creator-only: permanently deletes a challenge, cascading to every
 * member's data in it — their member doc, their logged activities, and
 * this challengeId off their own user.challengeIds. Runs server-side
 * (Admin SDK) because that last part writes to OTHER users' docs, which
 * Firestore rules don't let a client do directly (a user may only write
 * their own user doc / member doc) — same reasoning as /api/account.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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
  const challengeRef = db.collection(COLLECTIONS.challenges).doc(params.id);
  const challengeSnap = await challengeRef.get();
  if (!challengeSnap.exists) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  if (challengeSnap.data()?.createdBy !== uid) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [memberDocs, activityDocs] = await Promise.all([
    db.collection(COLLECTIONS.members(params.id)).get(),
    db.collection(COLLECTIONS.activities(params.id)).get(),
  ]);

  const batch = db.batch();
  batch.delete(challengeRef);
  memberDocs.docs.forEach((memberDoc) => {
    batch.delete(memberDoc.ref);
    // set+merge, not update: tolerates a member whose own user doc is
    // already gone (e.g. a stale member doc) without failing the batch.
    batch.set(
      db.collection(COLLECTIONS.users).doc(memberDoc.id),
      { challengeIds: FieldValue.arrayRemove(params.id) },
      { merge: true }
    );
  });
  activityDocs.docs.forEach((activityDoc) => batch.delete(activityDoc.ref));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
