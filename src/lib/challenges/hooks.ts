"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import useSWR from "swr";
import { firestoreDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { useAuth } from "@/lib/auth/auth-context";
import {
  fetchChallengesByIds,
  fetchMyActivityCount,
  fetchMyLastActivity,
  type RecentActivity,
} from "@/lib/challenges/service";
import { challengeStatus, localToday } from "@/lib/challenges/scoring";
import type { Activity, Challenge, ChallengeMember } from "@/types";

/** The signed-in user's challenges; refetches when their membership changes. */
export function useMyChallenges() {
  const { profile } = useAuth();
  const challengeIds = profile?.challengeIds ?? [];

  const { data, error, isLoading } = useSWR(
    profile ? ["my-challenges", ...challengeIds] : null,
    () => fetchChallengesByIds(challengeIds)
  );

  return { challenges: data ?? [], error, isLoading };
}

/** Live challenge doc; `challenge` is null while loading or if missing. */
export function useChallenge(challengeId: string) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(
      doc(firestoreDb(), COLLECTIONS.challenges, challengeId),
      (snap) => {
        setChallenge(
          snap.exists() ? ({ id: snap.id, ...snap.data() } as Challenge) : null
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [challengeId]);

  return { challenge, loading };
}

/** Live member list, unranked — order with rankMembers() at render time. */
export function useMembers(challengeId: string) {
  const [members, setMembers] = useState<ChallengeMember[]>([]);

  useEffect(() => {
    return onSnapshot(
      collection(firestoreDb(), COLLECTIONS.members(challengeId)),
      (snap) => setMembers(snap.docs.map((d) => d.data() as ChallengeMember))
    );
  }, [challengeId]);

  return members;
}

/** Live activity feed, newest first. */
export function useActivities(challengeId: string) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    return onSnapshot(
      query(
        collection(firestoreDb(), COLLECTIONS.activities(challengeId)),
        orderBy("startDate", "desc")
      ),
      (snap) =>
        setActivities(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Activity)
        )
    );
  }, [challengeId]);

  return activities;
}

export interface MyOverview {
  totalActivities: number;
  activeChallengeCount: number;
  totalChallengeCount: number;
  lastActivity: RecentActivity | null;
  isLoading: boolean;
}

/** Quick-glance stats for the signed-in user across all their challenges. */
export function useMyOverview(challenges: Challenge[]): MyOverview {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const challengeIds = challenges.map((c) => c.id);

  const { data, isLoading } = useSWR(
    uid ? ["my-overview", uid, ...challengeIds] : null,
    async () => {
      if (challengeIds.length === 0) {
        return { totalActivities: 0, lastActivity: null };
      }
      const [totalActivities, lastActivity] = await Promise.all([
        fetchMyActivityCount(challengeIds, uid!),
        fetchMyLastActivity(challenges, uid!),
      ]);
      return { totalActivities, lastActivity };
    }
  );

  return {
    totalActivities: data?.totalActivities ?? 0,
    lastActivity: data?.lastActivity ?? null,
    activeChallengeCount: challenges.filter(
      (c) => challengeStatus(c, localToday()) === "active"
    ).length,
    totalChallengeCount: challenges.length,
    isLoading,
  };
}
