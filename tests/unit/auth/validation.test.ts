import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  firstError,
} from "@/lib/auth/validation";

describe("registerSchema", () => {
  const valid = {
    displayName: "Andreas",
    email: "andreas@example.com",
    password: "supersecret",
  };

  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...valid, password: "short" });
    expect(result.success).toBe(false);
    expect(firstError(result)).toMatch(/at least 8/);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a display name that is too short after trimming", () => {
    const result = registerSchema.safeParse({ ...valid, displayName: " a " });
    expect(result.success).toBe(false);
  });

  it("trims the display name", () => {
    const result = registerSchema.parse({ ...valid, displayName: "  Andreas  " });
    expect(result.displayName).toBe("Andreas");
  });
});

describe("loginSchema", () => {
  it("accepts any non-empty password (no length rule on login)", () => {
    const result = loginSchema.safeParse({
      email: "andreas@example.com",
      password: "x",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "andreas@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("rejects a display name over 50 characters", () => {
    const result = profileSchema.safeParse({ displayName: "x".repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(resetPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(
      true
    );
  });

  it("rejects an invalid email", () => {
    const result = resetPasswordSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("firstError", () => {
  it("returns null for a successful parse", () => {
    expect(firstError(loginSchema.safeParse({ email: "a@b.co", password: "x" }))).toBeNull();
  });
});
