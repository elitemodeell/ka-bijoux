import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

const visitorIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidStoreVisitorId(value: unknown): value is string {
  return typeof value === "string" && visitorIdPattern.test(value);
}

function actorId(scope: "visitor" | "customer", value: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Chave de proteção de curtidas não configurada.");
  return createHmac("sha256", secret).update(`ka-store-like:${scope}:${value}`).digest("hex");
}

export async function storeLikeState(visitorId: string | null, customerId: string | null) {
  const visitorKey = visitorId ? actorId("visitor", visitorId) : null;
  const accountKey = customerId ? actorId("customer", customerId) : null;

  if (visitorKey && accountKey) {
    await prisma.$transaction(async (tx) => {
      const [visitorLike, accountLike] = await Promise.all([
        tx.storeLike.findUnique({ where: { id: visitorKey }, select: { id: true } }),
        tx.storeLike.findUnique({ where: { id: accountKey }, select: { id: true, customerId: true } }),
      ]);
      if (visitorLike && accountLike) {
        await tx.storeLike.delete({ where: { id: visitorKey } });
      } else if (visitorLike) {
        await tx.storeLike.update({
          where: { id: visitorKey },
          data: { id: accountKey, customerId },
        });
      } else if (accountLike && accountLike.customerId !== customerId) {
        await tx.storeLike.update({ where: { id: accountKey }, data: { customerId } });
      }
    });
  }

  const key = accountKey ?? visitorKey;
  const [count, liked] = await Promise.all([
    prisma.storeLike.count(),
    key ? prisma.storeLike.findUnique({ where: { id: key }, select: { id: true } }) : null,
  ]);
  return { count, liked: Boolean(liked) };
}

export async function setStoreLike(visitorId: string, customerId: string | null, liked: boolean) {
  const state = await storeLikeState(visitorId, customerId);
  const key = customerId ? actorId("customer", customerId) : actorId("visitor", visitorId);

  if (liked) {
    await prisma.storeLike.upsert({
      where: { id: key },
      create: { id: key, customerId },
      update: customerId ? { customerId } : {},
    });
  } else {
    await prisma.storeLike.deleteMany({ where: { id: key } });
  }

  const [count, current] = await Promise.all([
    prisma.storeLike.count(),
    prisma.storeLike.findUnique({ where: { id: key }, select: { id: true } }),
  ]);
  return { count, liked: Boolean(current), previousCount: state.count };
}
