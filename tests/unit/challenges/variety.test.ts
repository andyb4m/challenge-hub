import { describe, it, expect } from "vitest";
import {
  defaultVarietyKinds,
  kindCountFor,
  makeKindId,
  VARIETY_KINDS,
  varietyKinds,
  varietyMaxScore,
  varietyScore,
} from "@/lib/challenges/variety";

describe("default catalog", () => {
  it("has unique ids", () => {
    const ids = VARIETY_KINDS.map((k) => k.id);
    expect(new Set(ids).size).toBe(VARIETY_KINDS.length);
  });

  it("seeds new challenges with every kind counting once", () => {
    const kinds = defaultVarietyKinds();
    expect(kinds).toHaveLength(VARIETY_KINDS.length);
    expect(kinds.every((k) => k.maxCount === 1)).toBe(true);
  });
});

describe("varietyKinds", () => {
  it("uses the challenge's own config when present", () => {
    const kinds = varietyKinds({
      varietyConfig: { kinds: [{ id: "gym", label: "🏋️ Gym", maxCount: 3 }] },
    });
    expect(kinds).toHaveLength(1);
    expect(kinds[0].maxCount).toBe(3);
  });

  it("falls back to the default catalog for docs without a config", () => {
    expect(varietyKinds({ varietyConfig: null })).toHaveLength(
      VARIETY_KINDS.length
    );
  });
});

describe("varietyScore with per-kind limits", () => {
  const kinds = [
    { id: "gym", label: "🏋️ Gym", maxCount: 3 },
    { id: "yoga", label: "🧘 Yoga", maxCount: 1 },
    { id: "sup", label: "🛶 SUP", maxCount: 2 },
  ];

  it("counts each kind up to its maxCount", () => {
    const member = { kindCounts: { gym: 5, yoga: 1, sup: 1 } };
    // gym clamps at 3, yoga 1, sup 1
    expect(varietyScore(member, kinds)).toBe(5);
  });

  it("scores zero for kinds no longer in the config", () => {
    const member = { kindCounts: { removed: 4 } };
    expect(varietyScore(member, kinds)).toBe(0);
  });

  it("is zero for members without the field", () => {
    expect(varietyScore({}, kinds)).toBe(0);
  });

  it("computes the max score as the sum of limits", () => {
    expect(varietyMaxScore(kinds)).toBe(6);
  });
});

describe("kindCountFor", () => {
  it("reads the member's count with a zero default", () => {
    expect(kindCountFor({ kindCounts: { gym: 2 } }, "gym")).toBe(2);
    expect(kindCountFor({ kindCounts: { gym: 2 } }, "yoga")).toBe(0);
    expect(kindCountFor({}, "gym")).toBe(0);
  });
});

describe("makeKindId", () => {
  it("slugifies the label", () => {
    expect(makeKindId("🏇 Horse Riding!", [])).toBe("horse-riding");
  });

  it("suffixes on collision", () => {
    expect(makeKindId("Gym", ["gym"])).toBe("gym-2");
    expect(makeKindId("Gym", ["gym", "gym-2"])).toBe("gym-3");
  });

  it("falls back when the label has no usable characters", () => {
    expect(makeKindId("🏅", [])).toBe("kind");
  });
});
