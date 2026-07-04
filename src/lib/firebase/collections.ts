/**
 * Canonical Firestore collection paths.
 *
 * Collections:
 *   users/{uid}
 *   challenges/{challengeId}
 *   challenges/{challengeId}/members/{uid}
 *   challenges/{challengeId}/activities/{activityId}
 *
 * Invite tokens live as a field on the challenge doc (see
 * Challenge.inviteToken), not a separate collection.
 */
export const COLLECTIONS = {
  users: "users",
  challenges: "challenges",
  members: (challengeId: string) => `challenges/${challengeId}/members`,
  activities: (challengeId: string) => `challenges/${challengeId}/activities`,
} as const;
