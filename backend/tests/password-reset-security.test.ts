import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  generatePasswordResetCode,
  hashPasswordResetCode,
  verifyPasswordResetCode,
} from "@/lib/password-reset";

beforeEach(() => {
  vi.stubEnv(
    "JWT_SECRET",
    "synthetic-test-secret-with-at-least-32-characters"
  );
});

describe("password reset code security", () => {
  it("generates a six-digit numeric code", () => {
    expect(generatePasswordResetCode()).toMatch(/^\d{6}$/);
  });

  it("stores a keyed hash instead of the plain code", () => {
    const hash = hashPasswordResetCode(
      "cliente@example.test",
      "123456"
    );

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("123456");
  });

  it("verifies only the correct code and normalized email", () => {
    const hash = hashPasswordResetCode(
      "Cliente@Example.Test",
      "123456"
    );

    expect(
      verifyPasswordResetCode(
        "cliente@example.test",
        "123456",
        hash
      )
    ).toBe(true);
    expect(
      verifyPasswordResetCode(
        "cliente@example.test",
        "654321",
        hash
      )
    ).toBe(false);
  });
});
