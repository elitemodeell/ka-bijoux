import { NextResponse } from "next/server";

// POST /api/auth/admin/logout
export async function POST() {
  const response = NextResponse.redirect(
    new URL("/admin/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000")
  );

  response.cookies.set("ka-admin-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
