import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const SECRET = "test-admin-secret-with-at-least-32-characters";

function request(path: string, token?: string) {
  return new NextRequest(`https://admin.example.com${path}`, {
    headers: token ? { cookie: `ka-admin-token=${token}` } : undefined,
  });
}

function token(options: jwt.SignOptions = {}) {
  return jwt.sign(
    { id: "admin-1", email: "admin@kabijoux.com.br", role: "SUPER_ADMIN" },
    `${SECRET}-admin`,
    { algorithm: "HS256", expiresIn: "1h", ...options }
  );
}

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", SECRET);
});

describe("admin middleware session validation", () => {
  it("allows a correctly signed, unexpired admin session", async () => {
    const response = await middleware(request("/admin/dashboard", token()));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects a token signed with another secret", async () => {
    const forged = jwt.sign(
      { id: "admin-1", email: "admin@kabijoux.com.br", role: "SUPER_ADMIN" },
      "wrong-secret",
      { algorithm: "HS256", expiresIn: "1h" }
    );
    const response = await middleware(request("/admin/dashboard", forged));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.example.com/admin/login");
    expect(response.headers.get("set-cookie")).toContain("ka-admin-token=");
  });

  it("rejects an expired session", async () => {
    const response = await middleware(request("/admin/dashboard", token({ expiresIn: -1 })));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.example.com/admin/login");
  });

  it("keeps the login page public", async () => {
    const response = await middleware(request("/admin/login"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
