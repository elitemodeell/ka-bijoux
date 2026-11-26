import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const count = await prisma.storeLike.count();
    return apiSuccess({ count });
  } catch (error) {
    const status = error instanceof Error && error.message.toLowerCase().includes("autorizado") ? 401 : 500;
    return apiError(status === 401 ? "Acesso não autorizado." : "Erro ao consultar curtidas.", status);
  }
}
