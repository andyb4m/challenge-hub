import type { Challenge } from "@/types";
import { ChallengeCard } from "@/components/challenges/challenge-card";

/** Horizontal swipeable row (peeking cards) on mobile; a normal vertical list at sm+. */
export function ChallengeCarousel({ challenges }: { challenges: Challenge[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-col sm:overflow-visible sm:px-0 sm:pb-0">
      {challenges.map((challenge) => (
        <div
          key={challenge.id}
          className="w-[82%] shrink-0 snap-start sm:w-full sm:shrink"
        >
          <ChallengeCard challenge={challenge} />
        </div>
      ))}
    </div>
  );
}
