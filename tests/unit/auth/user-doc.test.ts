import { describe, it, expect } from "vitest";
import { buildNewUser } from "@/lib/auth/user-doc";

const now = new Date("2026-07-02T10:00:00Z");

describe("buildNewUser", () => {
  it("maps a fully-populated auth user", () => {
    const user = buildNewUser(
      {
        uid: "uid-1",
        displayName: "Andreas",
        email: "andreas@example.com",
        photoURL: "https://example.com/photo.jpg",
      },
      now
    );

    expect(user).toEqual({
      uid: "uid-1",
      displayName: "Andreas",
      email: "andreas@example.com",
      photoURL: "https://example.com/photo.jpg",
      createdAt: "2026-07-02T10:00:00.000Z",
      strava: null,
    });
  });

  it("falls back to the email local-part when displayName is missing", () => {
    const user = buildNewUser(
      { uid: "uid-2", displayName: null, email: "runner@example.com", photoURL: null },
      now
    );
    expect(user.displayName).toBe("runner");
  });

  it("falls back to a generic name when both displayName and email are missing", () => {
    const user = buildNewUser(
      { uid: "uid-3", displayName: null, email: null, photoURL: null },
      now
    );
    expect(user.displayName).toBe("Athlete");
    expect(user.email).toBe("");
  });

  it("always starts with no Strava connection", () => {
    const user = buildNewUser(
      { uid: "uid-4", displayName: "X Y", email: "x@y.com", photoURL: null },
      now
    );
    expect(user.strava).toBeNull();
  });
});
