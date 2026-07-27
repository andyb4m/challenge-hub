import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ActivityListSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-3 last:border-b-0 last:pb-0"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
