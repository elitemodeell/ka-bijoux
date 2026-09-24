import { createHash, createHmac, randomBytes } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email/resend";
import { buildAccountDeletionEmail } from "@/lib/email/templates";
import { deleteSupabaseUser, isSupabaseAuthTransitionEnabled } from "@/lib/supabase-auth";

export const ACCOUNT_DELETION_TOKEN_TTL_MS = 30 * 60 * 1000;
export const ACCOUNT_DELETION_GENERIC_MESSAGE =
  "Se o e-mail estiver cadastrado e ativo, você receberá as instruções para confirmar a exclusão.";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type DeletionTokenResult =
  | { status: "completed"; retainedOrderData: boolean }
  | { status: "cancelled" }
  | { status: "invalid" };

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function auditSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET é obrigatório para pseudonimizar a auditoria.");
  }
  return "ka-bijoux-account-deletion-local-only";
}

export function normalizeAccountEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function hashDeletionToken(token: string): string {
  return sha256(token);
}

export function hashAuditValue(value: string): string {
  return createHmac("sha256", auditSecret())
    .update(`account-deletion:${value}`)
    .digest("hex");
}

export function createDeletionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getRequestIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function getPublicSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (process.env.NODE_ENV === "production" && !configured) {
    throw new Error("NEXT_PUBLIC_APP_URL é obrigatória em produção.");
  }

  const raw =
    configured ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000";
  const url = new URL(raw);
  if (
    process.env.NODE_ENV === "production" &&
    url.origin !== "https://kabijoux.com.br"
  ) {
    throw new Error(
      "A URL pública de produção deve ser https://kabijoux.com.br."
    );
  }
  return url.origin;
}

export async function recordDeletionAudit(input: {
  event: string;
  outcome: string;
  customerId?: string | null;
  requestId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  details?: Prisma.InputJsonValue;
}, db: DatabaseClient = prisma): Promise<void> {
  await db.accountDeletionAudit.create({
    data: {
      event: input.event,
      outcome: input.outcome,
      customerRef: input.customerId ? hashAuditValue(input.customerId) : null,
      requestRef: input.requestId ? hashAuditValue(input.requestId) : null,
      emailHash: input.email ? hashAuditValue(normalizeAccountEmail(input.email)) : null,
      ipHash: input.ip ? hashAuditValue(input.ip) : null,
      userAgent: input.userAgent?.slice(0, 300) || null,
      details: input.details,
    },
  });
}

export async function createAccountDeletionRequest(input: {
  customerId: string;
  email: string;
  ip: string;
  userAgent?: string | null;
}): Promise<{ requestId: string; token: string; expiresAt: Date }> {
  const token = createDeletionToken();
  const expiresAt = new Date(Date.now() + ACCOUNT_DELETION_TOKEN_TTL_MS);

  const request = await prisma.$transaction(async (tx) => {
    await tx.accountDeletionRequest.updateMany({
      where: { customerId: input.customerId, status: "PENDING" },
      data: { status: "CANCELLED", usedAt: new Date(), cancelledAt: new Date() },
    });

    const created = await tx.accountDeletionRequest.create({
      data: {
        customerId: input.customerId,
        tokenHash: hashDeletionToken(token),
        expiresAt,
      },
    });

    await recordDeletionAudit(
      {
        event: "REQUEST_CREATED",
        outcome: "PENDING_EMAIL",
        customerId: input.customerId,
        requestId: created.id,
        email: input.email,
        ip: input.ip,
        userAgent: input.userAgent,
      },
      tx
    );
    return created;
  });

  return { requestId: request.id, token, expiresAt };
}

export async function sendAccountDeletionConfirmation(input: {
  requestId: string;
  email: string;
  token: string;
  expiresAt: Date;
}): Promise<boolean> {
  const confirmationUrl = new URL("/excluir-conta/confirmar", getPublicSiteUrl());
  confirmationUrl.searchParams.set("token", input.token);
  const template = buildAccountDeletionEmail({
    confirmationUrl: confirmationUrl.toString(),
    expiresAt: input.expiresAt,
  });

  const delivery = await sendTransactionalEmail({
    to: input.email,
    ...template,
    tags: [{ name: "flow", value: "account-deletion" }],
    idempotencyKey: `account-deletion-${input.requestId}`,
  });
  if (!delivery.ok) return false;

  await prisma.accountDeletionRequest.update({
    where: { id: input.requestId },
    data: { emailSentAt: new Date() },
  });
  return true;
}

export async function markDeletionEmailFailed(requestId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const request = await tx.accountDeletionRequest.update({
      where: { id: requestId },
      data: { status: "EMAIL_FAILED", usedAt: new Date() },
    });
    await recordDeletionAudit(
      {
        event: "EMAIL_DELIVERY",
        outcome: "FAILED",
        customerId: request.customerId,
        requestId,
      },
      tx
    );
  });
}

async function claimPendingToken(
  token: string,
  tx: Prisma.TransactionClient
): Promise<{ id: string; customerId: string } | null> {
  if (token.length < 32 || token.length > 128) return null;
  const tokenHash = hashDeletionToken(token);
  const request = await tx.accountDeletionRequest.findUnique({
    where: { tokenHash },
    select: { id: true, customerId: true },
  });
  if (!request) return null;

  const claimed = await tx.accountDeletionRequest.updateMany({
    where: {
      id: request.id,
      status: "PENDING",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { status: "PROCESSING", usedAt: new Date() },
  });
  return claimed.count === 1 ? request : null;
}

async function anonymizeCustomer(
  customerId: string,
  tx: Prisma.TransactionClient
): Promise<{
  found: boolean;
  alreadyDeleted: boolean;
  retainedOrderData: boolean;
  authUserId: string | null;
}> {
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      active: true,
      authUserId: true,
      orders: { select: { id: true }, take: 1 },
    },
  });
  if (!customer) {
    return { found: false, alreadyDeleted: false, retainedOrderData: false, authUserId: null };
  }
  if (!customer.active) {
    return {
      found: true,
      alreadyDeleted: true,
      retainedOrderData: customer.orders.length > 0,
      authUserId: customer.authUserId,
    };
  }

  await tx.favorite.deleteMany({ where: { customerId: customer.id } });
  await tx.notification.deleteMany({ where: { customerId: customer.id } });
  await tx.review.deleteMany({ where: { customerId: customer.id } });
  await tx.cart.deleteMany({ where: { customerId: customer.id } });
  await tx.address.deleteMany({
    where: { customerId: customer.id, orders: { none: {} } },
  });

  await tx.customer.update({
    where: { id: customer.id },
    data: {
      name: "Conta excluída",
      email: `deleted+${customer.id}@accounts.invalid`,
      phone: null,
      cpf: null,
      passwordHash: `deleted$${randomBytes(32).toString("hex")}`,
      active: false,
      pushToken: null,
      passwordResetCode: null,
      passwordResetExpires: null,
      authUserId: null,
      authMigratedAt: null,
    },
  });

  return {
    found: true,
    alreadyDeleted: false,
    retainedOrderData: customer.orders.length > 0,
    authUserId: customer.authUserId,
  };
}

async function removeSupabaseIdentity(authUserId: string | null): Promise<void> {
  if (!authUserId || !isSupabaseAuthTransitionEnabled()) return;
  const result = await deleteSupabaseUser(authUserId);
  if (result.error) {
    // O Customer já está anonimizado e desvinculado. A falha fica visível para
    // observabilidade e o usuário Auth órfão não consegue acessar dados comerciais.
    console.error("supabase auth account deletion failed");
  }
}

export async function executeAccountDeletion(
  token: string
): Promise<
  { status: "completed"; retainedOrderData: boolean } | { status: "invalid" }
> {
  const result = await prisma.$transaction(async (tx) => {
    const request = await claimPendingToken(token, tx);
    if (!request) return null;

    const deletion = await anonymizeCustomer(request.customerId, tx);
    if (!deletion.found || deletion.alreadyDeleted) {
      await tx.accountDeletionRequest.update({
        where: { id: request.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await recordDeletionAudit(
        {
          event: "DELETION_EXECUTED",
          outcome: "ALREADY_DELETED",
          customerId: request.customerId,
          requestId: request.id,
        },
        tx
      );
      return {
        retainedOrderData: deletion.retainedOrderData,
        authUserId: deletion.authUserId,
      };
    }

    await tx.accountDeletionRequest.update({
      where: { id: request.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await recordDeletionAudit(
      {
        event: "DELETION_EXECUTED",
        outcome: "COMPLETED",
        customerId: request.customerId,
        requestId: request.id,
        details: {
          retainedOrderData: deletion.retainedOrderData,
          retainedFinancialReferences: deletion.retainedOrderData,
          erased: [
            "profile",
            "credentials",
            "favorites",
            "reviews",
            "notifications",
            "cart",
            "unlinked_addresses",
          ],
        },
      },
      tx
    );

    return {
      retainedOrderData: deletion.retainedOrderData,
      authUserId: deletion.authUserId,
    };
  });

  if (!result) return { status: "invalid" };
  await removeSupabaseIdentity(result.authUserId);
  return { status: "completed", retainedOrderData: result.retainedOrderData };
}

export async function executeAuthenticatedAccountDeletion(
  customerId: string
): Promise<{ found: boolean; alreadyDeleted: boolean; retainedOrderData: boolean }> {
  const result = await prisma.$transaction(async (tx) => {
    const result = await anonymizeCustomer(customerId, tx);
    await recordDeletionAudit(
      {
        event: "AUTHENTICATED_DELETION",
        outcome: !result.found
          ? "NOT_FOUND"
          : result.alreadyDeleted
            ? "ALREADY_DELETED"
            : "COMPLETED",
        customerId,
        details: {
          retainedOrderData: result.retainedOrderData,
          retainedFinancialReferences: result.retainedOrderData,
        },
      },
      tx
    );
    return result;
  });
  await removeSupabaseIdentity(result.authUserId);
  return {
    found: result.found,
    alreadyDeleted: result.alreadyDeleted,
    retainedOrderData: result.retainedOrderData,
  };
}

export async function cancelAccountDeletion(
  token: string
): Promise<DeletionTokenResult> {
  const cancelled = await prisma.$transaction(async (tx) => {
    const request = await claimPendingToken(token, tx);
    if (!request) return false;
    await tx.accountDeletionRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await recordDeletionAudit(
      {
        event: "DELETION_CANCELLED",
        outcome: "CANCELLED",
        customerId: request.customerId,
        requestId: request.id,
      },
      tx
    );
    return true;
  });
  return cancelled ? { status: "cancelled" } : { status: "invalid" };
}
