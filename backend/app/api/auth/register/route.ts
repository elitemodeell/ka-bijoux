export const dynamic = 'force-dynamic';
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { rateLimit, RATE_LIMITS } from "@/lib/ratelimit";

const CONSENT_VERSION = "2026-07";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  acceptedTerms: z.boolean().refine((v) => v === true, {
    message: "É necessário aceitar os Termos de Uso e a Política de Privacidade.",
  }),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMITS.auth);
  if (limited) return limited;

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

    // Registrar consentimento LGPD
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? undefined;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    await prisma.consentLog.create({
      data: {
        customerId: customer.id,
        version: CONSENT_VERSION,
        ip,
        userAgent,
      },
    });

    const token = signCustomerToken({ id: customer.id, email: customer.email, name: customer.name });

    return apiSuccess({ customer, token }, 201);
  } catch (e) {
    if (e instanceof z.ZodError) return apiError(e.errors[0].message, 422);
    return apiError("Erro interno.", 500);
  }
}
