import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAdminToken } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = schema.parse(body);

    const admin = await prisma.admin.findUnique({ where: { email, active: true } });
    if (!admin) return apiError("Credenciais inválidas.", 401);

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return apiError("Credenciais inválidas.", 401);

    const token = signAdminToken({ id: admin.id, email: admin.email, role: admin.role });

    const response = NextResponse.json({
      data: {
        token,
        admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      },
    });

    // Cookie httpOnly para o painel web
    response.cookies.set("ka-admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24h
    });

    return response;
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro interno.", 500);
  }
}
