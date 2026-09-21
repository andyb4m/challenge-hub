import type { AdminUserSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TOP_N = 5;

export function AdminTopUsers({ users }: { users: AdminUserSummary[] }) {
  const top = [...users]
    .filter((u) => u.activityCount > 0)
    .sort((a, b) => b.activityCount - a.activityCount)
    .slice(0, TOP_N);

  if (top.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top active users</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        {top.map((user, i) => (
          <div
            key={user.uid}
            className="flex items-center justify-between gap-3 border-b border-line/40 py-2.5 text-sm first:pt-0 last:border-b-0 last:pb-0"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="w-4 shrink-0 text-xs text-faint">{i + 1}</span>
              <span className="truncate text-foreground">{user.displayName}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">
              {user.activityCount}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
