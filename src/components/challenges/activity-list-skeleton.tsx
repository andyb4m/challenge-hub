import { Skeleton } from "@/components/ui/skeleton";

export function ActivityListSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-line/40 py-4 first:pt-0 last:border-b-0 last:pb-0"
        >
          <div className="flex w-11 shrink-0 flex-col items-center gap-1 pt-0.5">
            <Skeleton className="h-3 w-7" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
