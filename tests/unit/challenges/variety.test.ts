import { describe, it, expect } from "vitest";
import {
  isLastOfKind,
  kindAlreadyCounted,
  VARIETY_KIND_IDS,
  VARIETY_KINDS,
  varietyKindLabel,
  varietyScore,
} from "@/lib/challenges/variety";

describe("variety catalog", () => {
  it("has unique ids", () => {
    expect(new Set(VARIETY_KIND_IDS).size).toBe(VARIETY_KINDS.length);
  });

  it("labels known kinds with their emoji", () => {
    expect(varietyKindLabel("climbing")).toBe("🧗 Climbing");
  });

  it("falls back to the raw id for unknown kinds", () => {
    expect(varietyKindLabel("quidditch")).toBe("quidditch");
  });
});

describe("varietyScore", () => {
  it("counts distinct kinds", () => {
    expect(varietyScore({ kinds: ["gym", "yoga", "sup"] })).toBe(3);
  });

  it("is zero for members without the field (goal-era docs)", () => {
    expect(varietyScore({})).toBe(0);
  });
});

describe("kindAlreadyCounted", () => {
  it("detects an already-counted kind", () => {
    expect(kindAlreadyCounted({ kinds: ["gym"] }, "gym")).toBe(true);
    expect(kindAlreadyCounted({ kinds: ["gym"] }, "yoga")).toBe(false);
  });
});

describe("isLastOfKind", () => {
  const mine = { id: "a1", uid: "me", varietyKind: "gym" };
  const mineAgain = { id: "a2", uid: "me", varietyKind: "gym" };
  const theirs = { id: "a3", uid: "friend", varietyKind: "gym" };

  it("is true when no other own activity has the kind", () => {
    expect(isLastOfKind(mine, [mine, theirs])).toBe(true);
  });

  it("is false when the member logged the kind twice", () => {
    expect(isLastOfKind(mine, [mine, mineAgain])).toBe(false);
  });

  it("is false for non-variety activities", () => {
    const plain = { id: "a4", uid: "me", varietyKind: null };
    expect(isLastOfKind(plain, [plain])).toBe(false);
  });
});
