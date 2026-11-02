import { describe, it, expect } from "vitest";
import {
  isAllowedScreenshotType,
  parseZoneScreenshotOutput,
} from "@/lib/challenges/zone-screenshot";

describe("parseZoneScreenshotOutput", () => {
  it("reshapes a valid structured output into {found, zones}", () => {
    const result = parseZoneScreenshotOutput({
      found: true,
      z2: 32.5,
      z3: 10,
      z4: 4,
      z5: 0,
    });
    expect(result).toEqual({
      found: true,
      zones: { z2: 32.5, z3: 10, z4: 4, z5: 0 },
    });
  });

  it("passes through found: false with zeroed zones", () => {
    const result = parseZoneScreenshotOutput({
      found: false,
      z2: 0,
      z3: 0,
      z4: 0,
      z5: 0,
    });
    expect(result.found).toBe(false);
  });

  it("throws on a negative zone value (model hallucination guard)", () => {
    expect(() =>
      parseZoneScreenshotOutput({ found: true, z2: -5, z3: 0, z4: 0, z5: 0 })
    ).toThrow();
  });

  it("throws on an implausibly large zone value", () => {
    expect(() =>
      parseZoneScreenshotOutput({ found: true, z2: 9999, z3: 0, z4: 0, z5: 0 })
    ).toThrow();
  });

  it("throws when a required field is missing", () => {
    expect(() =>
      parseZoneScreenshotOutput({ found: true, z2: 10, z3: 0, z4: 0 })
    ).toThrow();
  });

  it("throws on a non-object input", () => {
    expect(() => parseZoneScreenshotOutput("not an object")).toThrow();
  });
});

describe("isAllowedScreenshotType", () => {
  it("accepts the supported image types", () => {
    expect(isAllowedScreenshotType("image/jpeg")).toBe(true);
    expect(isAllowedScreenshotType("image/png")).toBe(true);
    expect(isAllowedScreenshotType("image/webp")).toBe(true);
    expect(isAllowedScreenshotType("image/gif")).toBe(true);
  });

  it("rejects unsupported types", () => {
    expect(isAllowedScreenshotType("image/heic")).toBe(false);
    expect(isAllowedScreenshotType("application/pdf")).toBe(false);
    expect(isAllowedScreenshotType("text/plain")).toBe(false);
  });
});
