import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ChallengeListSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-hidden px-4 sm:mx-0 sm:flex-col sm:px-0">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="w-[82%] shrink-0 sm:w-full sm:shrink">
          <Card>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
