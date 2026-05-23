import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const exists = await prisma.customer.findUnique({ where: { email: data.email } });
    if (exists) return apiError("E-mail já cadastrado.", 409);

    const passwordHash = await bcrypt.hash(data.password, 12);

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash,
      },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });

    const token = signCustomerToken({ id: customer.id, email: customer.email, name: customer.name });

    return apiSuccess({ customer, token }, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro interno.", 500);
  }
}
