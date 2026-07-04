import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

// POST /api/customers/me/push-token
export async function POST(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const { token } = await req.json();

    if (!token || typeof token !== "string") return apiError("Token inválido.", 400);

    await prisma.customer.update({
      where: { id: customer.id },
      data: { pushToken: token },
    });

    return apiSuccess({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao salvar token.", 500);
  }
}

// DELETE /api/customers/me/push-token — ao fazer logout
export async function DELETE(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { pushToken: null },
    });
    return apiSuccess({ ok: true });
  } catch {
    return apiSuccess({ ok: true }); // silencioso
  }
}
