import type { Challenge, User } from "@/types";

const TOKEN_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_LENGTH = 20;

/**
 * Random URL-safe token identifying a challenge's reusable invite link.
 * 62^20 ≈ 7e35 possibilities — unguessable at our scale.
 */
export function generateInviteToken(
  randomValues: (length: number) => Uint8Array = (length) =>
    crypto.getRandomValues(new Uint8Array(length))
): string {
  const bytes = randomValues(TOKEN_LENGTH);
  let token = "";
  for (const byte of bytes) {
    token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length];
  }
  return token;
}

export function buildJoinUrl(token: string, origin: string): string {
  return `${origin}/join/${token}`;
}

export type JoinEligibility =
  | { canJoin: true }
  | { canJoin: false; reason: "already-member" | "ended" };

/**
 * Whether a user may join a challenge via its invite link. The link is
 * reusable: it stays valid for everyone until the challenge ends.
 */
export function checkJoinEligibility(
  challenge: Pick<Challenge, "id" | "endDate">,
  profile: Pick<User, "challengeIds">,
  today: string // YYYY-MM-DD
): JoinEligibility {
  if ((profile.challengeIds ?? []).includes(challenge.id)) {
    return { canJoin: false, reason: "already-member" };
  }
  if (challenge.endDate < today) {
    return { canJoin: false, reason: "ended" };
  }
  return { canJoin: true };
}
