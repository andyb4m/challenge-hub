"use client";

import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/auth/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.push("/login");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted">Signed in on this device.</p>
        <Button variant="outline" onClick={handleSignOut} className="self-start">
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
