"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmail,
  signInWithGoogle,
  friendlyAuthError,
} from "@/lib/auth/service";
import { loginSchema, firstError } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    const validationError = firstError(parsed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      router.push("/profile");
    } catch (err) {
      setError(friendlyAuthError(err));
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.push("/profile");
    } catch (err) {
      setError(friendlyAuthError(err));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Welcome back — sign in to see your challenges.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs uppercase text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <GoogleSignInButton onClick={handleGoogle} disabled={submitting} />

          <p className="text-center text-sm text-gray-500">
            No account yet?{" "}
            <Link href="/register" className="font-medium text-gray-900 underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
