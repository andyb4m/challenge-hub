import { cn } from "@/lib/utils";

/**
 * "Strava" pill: marks a Strava-synced activity, or a user with Strava
 * connected (admin views). Brand orange from the `strava` token; the
 * text uses `strava.light` because the brand orange itself is under
 * 4.5:1 as small text on its own tint. One shared component because five
 * hand-copied versions had drifted (10px text, hardcoded hex).
 */
export function StravaBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full bg-strava/10 px-1.5 py-0.5 text-xs font-semibold text-strava-light",
        className
      )}
    >
      Strava
    </span>
  );
}
