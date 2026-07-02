import type { SportType } from "./challenge";

export type ActivitySource = "strava" | "manual";

export interface Activity {
  id: string;
  challengeId: string;
  uid: string;
  source: ActivitySource;
  stravaActivityId: number | null; // null for manual entries
  name: string;
  sportType: SportType;
  distance: number;    // metres
  movingTime: number;  // seconds
  elapsedTime: number; // seconds
  startDate: string;   // ISO 8601
  polyline: string | null;
  syncedAt: string;    // ISO 8601
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
