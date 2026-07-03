"use client";

import { useState } from "react";
import { buildJoinUrl } from "@/lib/challenges/invite";
import { Button } from "@/components/ui/button";

export function InviteLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = buildJoinUrl(token, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (http, permissions) — show the URL
      window.prompt("Copy this invite link:", url);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy invite link"}
    </Button>
  );
}
