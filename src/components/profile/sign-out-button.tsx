"use client";

import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/auth/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.push("/login");
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <p className="text-sm text-muted">Signed in on this device.</p>
        <Button variant="outline" onClick={handleSignOut}>
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
