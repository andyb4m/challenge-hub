"use client";

import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/auth/service";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.push("/login");
  }

  return (
    <Button variant="outline" onClick={handleSignOut} className="self-start">
      Sign out
    </Button>
  );
}
