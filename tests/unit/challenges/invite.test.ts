import { describe, it, expect } from "vitest";
import {
  buildJoinUrl,
  checkJoinEligibility,
  generateInviteToken,
} from "@/lib/challenges/invite";

describe("generateInviteToken", () => {
  it("produces a 20-char URL-safe token", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9]{20}$/);
  });

  it("uses the injected random source", () => {
    const token = generateInviteToken((length) => new Uint8Array(length)); // all zero bytes
    expect(token).toBe("A".repeat(20));
  });

  it("produces distinct tokens across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateInviteToken()));
    expect(tokens.size).toBe(50);
  });
});

describe("buildJoinUrl", () => {
  it("builds the join URL from origin and token", () => {
    expect(buildJoinUrl("abc123", "https://challengehub.app")).toBe(
      "https://challengehub.app/join/abc123"
    );
  });
});

describe("checkJoinEligibility (reusable invite link)", () => {
  const challenge = { id: "ch-1", endDate: "2026-07-31" };

  it("allows a signed-in non-member while the challenge is open", () => {
    expect(
      checkJoinEligibility(challenge, { challengeIds: ["other"] }, "2026-07-02")
    ).toEqual({ canJoin: true });
  });

  it("stays valid for multiple joiners (link is not single-use)", () => {
    for (const ids of [[], ["a"], ["a", "b"]]) {
      expect(
        checkJoinEligibility(challenge, { challengeIds: ids }, "2026-07-02")
          .canJoin
      ).toBe(true);
    }
  });

  it("rejects someone who already joined", () => {
    expect(
      checkJoinEligibility(challenge, { challengeIds: ["ch-1"] }, "2026-07-02")
    ).toEqual({ canJoin: false, reason: "already-member" });
  });

  it("rejects joining after the challenge ended", () => {
    expect(
      checkJoinEligibility(challenge, { challengeIds: [] }, "2026-08-01")
    ).toEqual({ canJoin: false, reason: "ended" });
  });

  it("allows joining on the final day", () => {
    expect(
      checkJoinEligibility(challenge, { challengeIds: [] }, "2026-07-31").canJoin
    ).toBe(true);
  });

  it("tolerates user docs without a challengeIds field", () => {
    expect(checkJoinEligibility(challenge, {}, "2026-07-02").canJoin).toBe(true);
  });
});
