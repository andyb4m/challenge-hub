"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/challenges");
    }
  }, [loading, user, router]);

  // Signed-in users land on /challenges instead — avoid flashing the
  // marketing page while that redirect is in flight.
  if (loading || user) {
    return <div className="min-h-[80vh]" />;
  }

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center bg-gradient-hero p-8 text-center">
      <h1 className="text-4xl font-extrabold text-foreground sm:text-5xl">
        Challenge <span className="text-gradient">Hub</span>
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted">
        Compete in fitness challenges with friends, powered by Strava. 💪
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/register">
          <Button size="lg">Get started</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="lg">
            Sign in
          </Button>
        </Link>
      </div>
    </main>
  );
}
