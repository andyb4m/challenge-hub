import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Challenge } from "@/types";

/**
 * Public invite preview lookup. Runs server-side with the Admin SDK so
 * non-members can preview a challenge from its invite link without the
 * client needing broad read access to the challenges collection (see
 * firestore.rules: challenges/{id} reads are member-only).
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const snapshot = await adminDb()
    .collection(COLLECTIONS.challenges)
    .where("inviteToken", "==", params.token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  const doc = snapshot.docs[0];
  const challenge = { id: doc.id, ...doc.data() } as Challenge;
  return NextResponse.json(challenge);
}
