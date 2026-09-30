import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function validAdminToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const decoder = new TextDecoder();
    const header = JSON.parse(decoder.decode(decodeBase64Url(parts[0])));
    const payload = JSON.parse(decoder.decode(decodeBase64Url(parts[1])));
    if (header.alg !== "HS256" || header.typ !== "JWT") return false;
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return false;
    if (typeof payload.id !== "string" || typeof payload.email !== "string" || typeof payload.role !== "string") {
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(`${secret}-admin`),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
  } catch {
    return false;
  }
}

function redirectToLogin(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.delete("ka-admin-token");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = request.cookies.get("ka-admin-token")?.value;

    if (!adminToken || !(await validAdminToken(adminToken))) return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
