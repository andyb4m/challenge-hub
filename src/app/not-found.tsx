import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">
        404
      </p>
      <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
      <p className="max-w-sm text-sm text-muted">
        This page doesn&apos;t exist, or you don&apos;t have access to it.
        Double-check the link, or head back to your challenges.
      </p>
      <Link href="/challenges" className="mt-2">
        <Button>Back to challenges</Button>
      </Link>
    </main>
  );
}
