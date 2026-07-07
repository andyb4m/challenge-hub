"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { signOutUser } from "@/lib/auth/service";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/account-menu";

export function SiteHeader() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-semibold text-foreground">
          Challenge Hub
        </Link>

        {loading ? null : user ? (
          <AccountMenu
            displayName={profile?.displayName ?? "Profile"}
            photoURL={profile?.photoURL ?? null}
            onSignOut={handleSignOut}
          />
        ) : (
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
