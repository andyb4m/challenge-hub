import { describe, it, expect } from "vitest";

interface InviteRecord {
  challengeId: string;
  createdBy: string;
  createdAt: string;
  usedBy: string | null;
  usedAt: string | null;
}

function canUseInvite(invite: InviteRecord, uid: string): boolean {
  if (invite.usedBy !== null) return false;
  if (invite.createdBy === uid) return false;
  return true;
}

describe("invite token validation", () => {
  const base: InviteRecord = {
    challengeId: "challenge-123",
    createdBy: "user-creator",
    createdAt: "2025-01-01T00:00:00Z",
    usedBy: null,
    usedAt: null,
  };

  it("allows a valid unused invite for a different user", () => {
    expect(canUseInvite(base, "user-joiner")).toBe(true);
  });

  it("rejects an already-used invite", () => {
    const used = { ...base, usedBy: "user-other", usedAt: "2025-01-02T00:00:00Z" };
    expect(canUseInvite(used, "user-joiner")).toBe(false);
  });

  it("rejects the challenge creator using their own invite", () => {
    expect(canUseInvite(base, "user-creator")).toBe(false);
  });
});
