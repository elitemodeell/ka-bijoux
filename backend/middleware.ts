import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminToken = request.cookies.get("ka-admin-token")?.value;

    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Verifica se é um JWT com 3 partes (header.payload.signature)
    // A verificação completa da assinatura ocorre nas API routes via verifyAdminToken
    const parts = adminToken.split(".");
    if (parts.length !== 3) {
      const res = NextResponse.redirect(new URL("/admin/login", request.url));
      res.cookies.delete("ka-admin-token");
      return res;
    }

    // Checa expiração sem verificar assinatura (edge runtime não suporta crypto Node)
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        const res = NextResponse.redirect(new URL("/admin/login", request.url));
        res.cookies.delete("ka-admin-token");
        return res;
      }
    } catch {
      const res = NextResponse.redirect(new URL("/admin/login", request.url));
      res.cookies.delete("ka-admin-token");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
