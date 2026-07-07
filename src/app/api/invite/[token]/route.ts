import { NextResponse } from "next/server";
import { findChallengeByTokenServer } from "@/lib/challenges/invite-server";

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
  const challenge = await findChallengeByTokenServer(params.token);
  if (!challenge) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }
  return NextResponse.json(challenge);
}
