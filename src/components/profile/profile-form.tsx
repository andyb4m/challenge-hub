"use client";

import { useRef, useState, type FormEvent } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "@/types";
import {
  updateDisplayName,
  uploadProfilePhoto,
  friendlyAuthError,
} from "@/lib/auth/service";
import { profileSchema, firstError } from "@/lib/auth/validation";
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

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Firebase Storage requires the Blaze plan on new projects; the bucket isn't
// set up yet, so photo upload stays hidden until this flag is flipped on.
const PHOTO_UPLOAD_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_PHOTO_UPLOAD === "true";

export function ProfileForm({
  user,
  profile,
}: {
  user: FirebaseUser;
  profile: User;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "saved" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const parsed = profileSchema.safeParse({ displayName });
    const validationError = firstError(parsed);
    if (validationError) {
      setStatus({ kind: "error", message: validationError });
      return;
    }

    setStatus({ kind: "saving" });
    try {
      await updateDisplayName(user, displayName.trim());
      setStatus({ kind: "saved" });
    } catch (err) {
      setStatus({ kind: "error", message: friendlyAuthError(err) });
    }
  }

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ kind: "error", message: "Please choose an image file." });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setStatus({ kind: "error", message: "Photo must be under 5 MB." });
      return;
    }

    setStatus({ kind: "saving" });
    try {
      await uploadProfilePhoto(user, file);
      setStatus({ kind: "saved" });
    } catch (err) {
      setStatus({ kind: "error", message: friendlyAuthError(err) });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          How you appear to other challenge members.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          {profile.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoURL}
              alt="Profile photo"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-line text-xl font-medium text-muted">
              {profile.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            {PHOTO_UPLOAD_ENABLED ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={status.kind === "saving"}
                >
                  Change photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                />
              </>
            ) : (
              <p className="max-w-xs text-xs text-faint">
                Photo upload isn&apos;t available yet. Accounts created with
                Google use their Google profile photo.
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profileEmail">Email</Label>
            <Input id="profileEmail" value={profile.email} disabled />
          </div>

          {status.kind === "error" && (
            <p role="alert" className="text-sm text-error">
              {status.message}
            </p>
          )}
          {status.kind === "saved" && (
            <p className="text-sm text-success">Saved.</p>
          )}

          <Button
            type="submit"
            className="self-start"
            disabled={status.kind === "saving"}
          >
            {status.kind === "saving" ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
