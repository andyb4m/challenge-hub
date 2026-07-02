"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { signOutUser } from "@/lib/auth/service";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.push("/login");
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="font-semibold text-gray-900">
          Challenge Hub
        </Link>

        {loading ? null : user ? (
          <nav className="flex items-center gap-3">
            <Link
              href="/challenges"
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              Challenges
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              {profile?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.photoURL}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                  {(profile?.displayName ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              {profile?.displayName ?? "Profile"}
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </nav>
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
