import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { anonymizeCustomerAccount } from "@/lib/account-deletion";
import { deleteSupabaseUser, getSupabaseUser } from "@/lib/supabase-auth";
import { apiSuccess, apiError } from "@/lib/utils";
import { AppleSignInServerError, revokeStoredAppleAuthorization } from "@/lib/apple-sign-in";

// GET /api/customers/me
export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const data = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        id: true, name: true, email: true,
        phone: true, cpf: true, createdAt: true,
      },
    });
    return apiSuccess(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar dados.", 500);
  }
}

// PATCH /api/customers/me
export async function PATCH(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const body = await req.json();
    const { name, phone } = body;

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao atualizar dados.", 500);
  }
}

// DELETE /api/customers/me — Exclusão de conta (obrigatório Play Store / App Store)
export async function DELETE(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const body = await req.json().catch(() => ({}));
    const { password } = body as { password?: string };
    const user = await prisma.customer.findUnique({ where: { id: customer.id } });
    if (!user) return apiError("Usuário não encontrado.", 404);

    const accessToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    let providers: string[] = [];
    if (user.authUserId) {
      const auth = await getSupabaseUser(accessToken);
      if (auth.error || !auth.data.user || auth.data.user.id !== user.authUserId) {
        return apiError("Não autorizado.", 401);
      }
      providers = (auth.data.user.identities ?? []).map((identity) => identity.provider);
    }

    let appleAuthorizationRevoked = false;
    if (providers.includes("apple")) {
      const revocation = await revokeStoredAppleAuthorization(customer.id);
      appleAuthorizationRevoked = revocation === "revoked";
    }

    const socialAccount = providers.some((provider) => provider === "apple" || provider === "google");
    if (!socialAccount) {
      if (!password) return apiError("Informe sua senha para excluir a conta.", 400);
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return apiError("Senha incorreta.", 401);
    }

    if (user.authUserId) {
      const removed = await deleteSupabaseUser(user.authUserId);
      if (removed.error && removed.error.status !== 404) {
        return apiError("Não foi possível invalidar a conta de autenticação.", 503);
      }
    }

    await anonymizeCustomerAccount(customer.id);

    const response = apiSuccess({
      message: "Conta excluída com sucesso.",
      accountDeleted: true,
      retainedOrderRecords: true,
      providers,
      appleAuthorizationRevoked,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    if (e instanceof AppleSignInServerError) {
      return apiError("Não foi possível revogar a autorização Apple. Tente novamente.", 503);
    }
    return apiError("Erro ao excluir conta.", 500);
  }
}
