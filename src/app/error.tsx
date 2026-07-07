"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-error">
        Something went wrong
      </p>
      <h1 className="text-2xl font-bold text-foreground">
        That didn&apos;t work
      </h1>
      <p className="max-w-sm text-sm text-muted">
        An unexpected error occurred. You can try again, or head back to
        your challenges.
      </p>
      <div className="mt-2 flex gap-3">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Link href="/challenges">
          <Button>Back to challenges</Button>
        </Link>
      </div>
    </main>
  );
}
