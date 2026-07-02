import type { SportType } from "./challenge";

export type ActivitySource = "strava" | "manual";

/** Sub-type of an entry in a zone (points) challenge */
export type ZoneActivityKind = "zone-training" | "others" | "recovery";

export interface Activity {
  id: string;
  challengeId: string;
  uid: string;
  source: ActivitySource;
  stravaActivityId: number | null; // null for manual entries
  name: string;
  sportType: SportType | null; // null in zone/variety challenges
  distance: number;    // metres
  movingTime: number;  // seconds
  elapsedTime: number; // seconds
  startDate: string;   // ISO 8601
  polyline: string | null;
  syncedAt: string;    // ISO 8601
  /** zone challenges: which entry type this is */
  zoneKind?: ZoneActivityKind | null;
  /** zone challenges: decimal minutes per zone (zone-training only) */
  zones?: { z2: number; z3: number; z4: number; z5: number } | null;
  /** zone challenges: points this single activity earned (pre-bonus) */
  points?: number | null;
  /** variety challenges: catalog id of the activity kind */
  varietyKind?: string | null;
}

/** Raw activity shape returned by the Strava API */
export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  start_date: string;
  map: {
    summary_polyline: string | null;
  };
  athlete: {
    id: number;
  };
}

/** Payload sent by Strava webhook POST */
export interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  aspect_type: "create" | "update" | "delete";
  object_id: number;
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates: Record<string, string>;
}
