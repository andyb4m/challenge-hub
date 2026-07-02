import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
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
