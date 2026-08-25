import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DELETED_CUSTOMER_NAME = "Conta excluída";

export function anonymizedCustomerEmail(customerId: string): string {
  return `deleted+${customerId}@deleted.kabijoux.invalid`;
}

export async function anonymizeCustomerAccount(customerId: string) {
  const replacementPasswordHash = await bcrypt.hash(randomUUID(), 12);
  const deletedAt = new Date();

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const current = await tx.customer.findUniqueOrThrow({ where: { id: customerId }, select: { email: true } });
    await tx.pendingEmailRegistration.deleteMany({
      where: { email: { equals: current.email } },
    });
    await tx.cart.deleteMany({ where: { customerId } });
    await tx.favorite.deleteMany({ where: { customerId } });
    await tx.notification.deleteMany({ where: { customerId } });
    await tx.review.deleteMany({ where: { customerId } });
    await tx.address.deleteMany({ where: { customerId, orders: { none: {} } } });
    await tx.consentLog.updateMany({
      where: { customerId },
      data: { ip: null, userAgent: null },
    });

    return tx.customer.update({
      where: { id: customerId },
      data: {
        active: false,
        deletedAt,
        name: DELETED_CUSTOMER_NAME,
        email: anonymizedCustomerEmail(customerId),
        phone: null,
        cpf: null,
        passwordHash: replacementPasswordHash,
        pushToken: null,
        passwordResetCode: null,
        passwordResetExpires: null,
        authUserId: null,
        authMigratedAt: null,
      },
      select: { id: true, active: true, deletedAt: true },
    });
  });
}
