import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Challenge } from "@/types";

/**
 * Public invite preview lookup (Admin SDK). Shared by the /api/invite/[token]
 * route and /join/[token]'s generateMetadata — both need to preview a
 * challenge for a non-member, which firestore.rules forbids client-side.
 */
export async function findChallengeByTokenServer(
  token: string
): Promise<Challenge | null> {
  const snapshot = await adminDb()
    .collection(COLLECTIONS.challenges)
    .where("inviteToken", "==", token)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Challenge;
}
