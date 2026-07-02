import { describe, it, expect } from "vitest";
import { DEFAULT_AFTER_AUTH, safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it("passes through same-site absolute paths", () => {
    expect(safeNextPath("/join/abc123")).toBe("/join/abc123");
    expect(safeNextPath("/challenges")).toBe("/challenges");
  });

  it("falls back to the default when absent", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_AFTER_AUTH);
    expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_AUTH);
    expect(safeNextPath("")).toBe(DEFAULT_AFTER_AUTH);
  });

  it("rejects open-redirect attempts", () => {
    expect(safeNextPath("https://evil.example")).toBe(DEFAULT_AFTER_AUTH);
    expect(safeNextPath("//evil.example")).toBe(DEFAULT_AFTER_AUTH);
    expect(safeNextPath("javascript:alert(1)")).toBe(DEFAULT_AFTER_AUTH);
  });
});
