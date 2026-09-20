"use client";

import { useRef, useState } from "react";
import type { Challenge } from "@/types";
import { ChallengeCard } from "@/components/challenges/challenge-card";
import { cn } from "@/lib/utils";

const GAP_PX = 12; // matches gap-3

/** Horizontal swipeable row on mobile (native scrollbar hidden, dots instead); a normal vertical list at sm+. */
export function ChallengeCarousel({ challenges }: { challenges: Challenge[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    if (!track || !first) return;
    const step = first.offsetWidth + GAP_PX;
    setActiveIndex(Math.round(track.scrollLeft / step));
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto sm:flex-col sm:overflow-visible"
      >
        {challenges.map((challenge) => (
          <div
            key={challenge.id}
            className="w-[82%] shrink-0 snap-start sm:w-full sm:shrink"
          >
            <ChallengeCard challenge={challenge} />
          </div>
        ))}
      </div>
      {challenges.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 sm:hidden">
          {challenges.map((challenge, i) => (
            <span
              key={challenge.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeIndex ? "w-4 bg-primary" : "w-1.5 bg-line"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
