import type { User } from "@/types";

/** The subset of firebase/auth User we need to build a profile document. */
export interface AuthUserLike {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/**
 * Maps a Firebase Auth user to a new Firestore user document.
 * Falls back to the email local-part when no display name is set
 * (email/password sign-ups have no displayName until updateProfile runs).
 */
export function buildNewUser(
  authUser: AuthUserLike,
  now: Date = new Date()
): User {
  const fallbackName = authUser.email?.split("@")[0] ?? "Athlete";
  return {
    uid: authUser.uid,
    displayName: authUser.displayName?.trim() || fallbackName,
    email: authUser.email ?? "",
    photoURL: authUser.photoURL,
    createdAt: now.toISOString(),
    strava: null,
    challengeIds: [],
  };
}
