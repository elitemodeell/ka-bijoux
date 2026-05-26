export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = schema.parse(body);

    const customer = await prisma.customer.findUnique({ where: { email, active: true } });
    if (!customer) return apiError("Credenciais inválidas.", 401);

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) return apiError("Credenciais inválidas.", 401);

    const token = signCustomerToken({ id: customer.id, email: customer.email, name: customer.name });

    return apiSuccess({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro interno.", 500);
  }
}
