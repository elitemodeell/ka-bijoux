import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  bcryptCompare: vi.fn(),
  findFirst: vi.fn(),
  signAdminToken: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mocks.bcryptCompare },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { admin: { findFirst: mocks.findFirst } },
}));

vi.mock("@/lib/auth", () => ({
  signAdminToken: mocks.signAdminToken,
}));

vi.mock("@/lib/ratelimit", () => ({
  rateLimit: mocks.rateLimit,
  RATE_LIMITS: { adminAuth: { keyPrefix: "admin-auth" } },
}));

import { POST as login } from "@/app/api/auth/admin/login/route";
import { POST as logout } from "@/app/api/auth/admin/logout/route";

function loginRequest(body: unknown) {
  return new NextRequest("https://admin.example.com/api/auth/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signAdminToken.mockReturnValue("signed-admin-token");
  mocks.bcryptCompare.mockResolvedValue(true);
  mocks.rateLimit.mockResolvedValue(null);
  mocks.findFirst.mockResolvedValue({
    id: "admin-1",
    name: "Administrador",
    email: "admin@kabijoux.com.br",
    password: "password-hash",
    role: "SUPER_ADMIN",
    active: true,
    updatedAt: new Date("2026-10-13T12:00:00.000Z"),
  });
});

describe("admin authentication routes", () => {
  it("normalizes the e-mail, validates the password, and creates a root session cookie", async () => {
    const response = await login(loginRequest({
      email: "  ADMIN@KABIJOUX.COM.BR  ",
      password: "correct-password",
    }));

    expect(response.status).toBe(200);
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: "admin@kabijoux.com.br", mode: "insensitive" },
        active: true,
      },
    });
    expect(mocks.bcryptCompare).toHaveBeenCalledWith("correct-password", "password-hash");
    expect(mocks.signAdminToken).toHaveBeenCalledWith(expect.objectContaining({
      id: "admin-1",
      sessionVersion: Date.parse("2026-10-13T12:00:00.000Z"),
    }));
    expect(mocks.rateLimit).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({ keyPrefix: "admin-auth" })
    );
    const payload = await response.json();
    expect(payload).toMatchObject({
      data: { admin: { id: "admin-1", email: "admin@kabijoux.com.br" } },
    });
    expect(payload.data).not.toHaveProperty("token");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("ka-admin-token=signed-admin-token");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=strict");
  });

  it("stops before the database when the admin login is rate limited", async () => {
    mocks.rateLimit.mockResolvedValue(new Response(null, { status: 429 }));

    const response = await login(loginRequest({
      email: "admin@example.com",
      password: "password",
    }));

    expect(response.status).toBe(429);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("returns a clear authentication failure without creating a session", async () => {
    mocks.bcryptCompare.mockResolvedValue(false);

    const response = await login(loginRequest({
      email: "admin@kabijoux.com.br",
      password: "wrong-password",
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Credenciais inválidas." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects the old password after rotation and accepts the new password", async () => {
    mocks.bcryptCompare.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const oldResponse = await login(loginRequest({
      email: "admin@kabijoux.com.br",
      password: "old-password",
    }));
    const newResponse = await login(loginRequest({
      email: "admin@kabijoux.com.br",
      password: "new-password",
    }));

    expect(oldResponse.status).toBe(401);
    expect(newResponse.status).toBe(200);
  });

  it("rejects invalid input before querying the database", async () => {
    const response = await login(loginRequest({ email: "invalid", password: "" }));

    expect(response.status).toBe(422);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("clears the same root cookie and redirects on the current origin", async () => {
    const request = new NextRequest("https://admin.example.com/api/auth/admin/logout", {
      method: "POST",
    });
    const response = await logout(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.example.com/admin/login");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("ka-admin-token=");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("SameSite=strict");
  });
});
