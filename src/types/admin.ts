export interface AdminStats {
  totalUsers: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  stravaConnectedUsers: number;
  totalChallenges: number;
  activeChallenges: number;
  upcomingChallenges: number;
  endedChallenges: number;
  challengesByType: { goal: number; zone: number; variety: number };
  /** rounded to 1 decimal */
  avgMembersPerChallenge: number;
  totalActivities: number;
  manualActivities: number;
  stravaActivities: number;
  /** users with at least one activity logged in the last 7/30 days */
  usersActiveLast7Days: number;
  usersActiveLast30Days: number;
  mostActiveChallenge: { id: string; name: string; activityCount: number } | null;
}

export interface AdminUserSummary {
  uid: string;
  displayName: string;
  email: string;
  createdAt: string; // ISO 8601
  stravaConnected: boolean;
  challengeCount: number;
  activityCount: number;
  /** ISO date (YYYY-MM-DD) of their most recent logged activity, across all challenges */
  lastActivityDate: string | null;
}
