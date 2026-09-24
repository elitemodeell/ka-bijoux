import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth";
import { isValidCpf, normalizeCpf } from "@/lib/checkout/cpf";
import { executeAuthenticatedAccountDeletion } from "@/lib/account-deletion";
import { apiSuccess, apiError } from "@/lib/utils";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidPhone(value: string): boolean {
  return /^(?:\d{10}|\d{11})$/.test(value) && !/^(\d)\1+$/.test(value);
}

function formatCpfForLegacyLookup(cpf: string): string {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome completo.").max(120).optional(),
    phone: z
      .union([z.string().trim().max(30), z.null()])
      .transform((value) => (value === null || value === "" ? null : normalizePhone(value)))
      .refine((value) => value === null || isValidPhone(value), "Telefone inválido.")
      .optional(),
    cpf: z
      .string()
      .transform(normalizeCpf)
      .refine(isValidCpf, "CPF inválido.")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Nenhum dado para atualizar.");

// GET /api/customers/me
export async function GET(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const data = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        createdAt: true,
      },
    });
    if (!data) return apiError("Perfil não encontrado.", 404, "PROFILE_NOT_FOUND");
    return apiSuccess(data);
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Sessão expirada. Entre novamente.", 401, "SESSION_EXPIRED");
    }
    return apiError("Falha temporária ao buscar o perfil.", 500, "TEMPORARY_FAILURE");
  }
}

// PATCH /api/customers/me
export async function PATCH(req: NextRequest) {
  try {
    const authenticated = await requireCustomer(req);
    const data = updateProfileSchema.parse(await req.json());

    const current = await prisma.customer.findUnique({
      where: { id: authenticated.id },
      select: {
        cpf: true,
      },
    });
    if (!current) return apiError("Perfil não encontrado.", 404, "PROFILE_NOT_FOUND");

    const currentCpf = normalizeCpf(current.cpf ?? "");
    const requestedCpf = data.cpf;
    const cpfChanged = requestedCpf !== undefined && currentCpf !== requestedCpf;
    const normalizeStoredCpf =
      requestedCpf !== undefined && currentCpf === requestedCpf && current.cpf !== currentCpf;
    const updateData = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(normalizeStoredCpf ? { cpf: currentCpf } : {}),
    };

    if (requestedCpf !== undefined && cpfChanged) {
      if (currentCpf) {
        return apiError(
          "O CPF já vinculado a este perfil não pode ser alterado.",
          409,
          "CPF_IMMUTABLE"
        );
      }

      const cpfOwner = await prisma.customer.findFirst({
        where: {
          id: { not: authenticated.id },
          cpf: { in: [requestedCpf, formatCpfForLegacyLookup(requestedCpf)] },
        },
        select: { id: true },
      });
      if (cpfOwner) {
        return apiError(
          "Este CPF já está vinculado a outra conta.",
          409,
          "CPF_IN_USE"
        );
      }

      const changed = await prisma.customer.updateMany({
        where: {
          id: authenticated.id,
          cpf: null,
        },
        data: { ...updateData, cpf: requestedCpf },
      });
      if (changed.count !== 1) {
        const latest = await prisma.customer.findUnique({
          where: { id: authenticated.id },
          select: { cpf: true },
        });
        if (normalizeCpf(latest?.cpf ?? "") !== requestedCpf) {
          return apiError(
            "O CPF já vinculado a este perfil não pode ser alterado.",
            409,
            "CPF_IMMUTABLE"
          );
        }
        await prisma.customer.update({
          where: { id: authenticated.id },
          data: updateData,
        });
      }
    } else {
      await prisma.customer.update({
        where: { id: authenticated.id },
        data: updateData,
      });
    }

    const updated = await prisma.customer.findUnique({
      where: { id: authenticated.id },
      select: { id: true, name: true, email: true, phone: true, cpf: true },
    });
    if (!updated) return apiError("Perfil não encontrado.", 404, "PROFILE_NOT_FOUND");
    return apiSuccess(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.errors[0];
      const code = issue.path[0] === "cpf"
        ? "CPF_INVALID"
        : issue.path[0] === "phone"
          ? "PHONE_INVALID"
          : "VALIDATION_ERROR";
      return apiError(issue.message, 422, code);
    }
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Sessão expirada. Entre novamente.", 401, "SESSION_EXPIRED");
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError("Este CPF já está vinculado a outra conta.", 409, "CPF_IN_USE");
    }
    console.error("Erro ao atualizar perfil", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
    });
    return apiError("Falha temporária ao atualizar o perfil.", 500, "TEMPORARY_FAILURE");
  }
}

// DELETE /api/customers/me — exclusão de conta
export async function DELETE(req: NextRequest) {
  try {
    const customer = await requireCustomer(req);
    const body = await req.json().catch(() => ({}));
    const { confirmation } = body as { confirmation?: string };

    // A sessão Bearer já confirma a identidade. Exigir senha impediria contas
    // criadas exclusivamente pelo Google de exercer a exclusão dentro do app.
    // A frase literal mantém uma confirmação destrutiva consciente sem criar
    // um bypass específico por provedor de autenticação.
    if (confirmation !== "EXCLUIR") {
      return apiError('Digite "EXCLUIR" para confirmar a exclusão.', 422);
    }

    const deletion = await executeAuthenticatedAccountDeletion(customer.id);
    if (!deletion.found) return apiError("Usuário não encontrado.", 404);
    return apiSuccess({
      message: "Conta excluída com sucesso.",
      retainedOrderData: deletion.retainedOrderData,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") {
      return apiError("Não autorizado.", 401);
    }
    return apiError("Erro ao excluir conta.", 500);
  }
}
