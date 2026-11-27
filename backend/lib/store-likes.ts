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
      const visitorLike = await tx.storeLike.findUnique({
        where: { id: visitorKey },
        select: { id: true },
      });
      if (!visitorLike) return;

      // Upsert the authenticated actor first, then remove the anonymous key.
      // This makes concurrent auth refreshes/remounts idempotent: a visitor like
      // is retained once, and an existing customer like is not counted twice.
      await tx.storeLike.upsert({
        where: { id: accountKey },
        create: { id: accountKey, customerId },
        update: { customerId },
      });
      await tx.storeLike.deleteMany({
        where: { id: visitorKey },
      });
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
  const visitorKey = actorId("visitor", visitorId);
  const key = customerId ? actorId("customer", customerId) : visitorKey;

  if (customerId) {
    // Merge the visitor identity and apply the user's requested state in one
    // transaction. A concurrent auth refresh can no longer resurrect a like
    // after the user has explicitly removed it.
    await prisma.$transaction(async (tx) => {
      const visitorLike = await tx.storeLike.findUnique({
        where: { id: visitorKey },
        select: { id: true },
      });
      if (visitorLike && liked) {
        await tx.storeLike.upsert({
          where: { id: key },
          create: { id: key, customerId },
          update: { customerId },
        });
      }
      await tx.storeLike.deleteMany({ where: { id: visitorKey } });
      if (liked && !visitorLike) {
        await tx.storeLike.upsert({
          where: { id: key },
          create: { id: key, customerId },
          update: { customerId },
        });
      } else {
        await tx.storeLike.deleteMany({ where: { id: key } });
      }
    });
  } else if (liked) {
    await prisma.storeLike.upsert({
      where: { id: key },
      create: { id: key, customerId: null },
      update: {},
    });
  } else {
    await prisma.storeLike.deleteMany({ where: { id: key } });
  }

  const [count, current] = await Promise.all([
    prisma.storeLike.count(),
    prisma.storeLike.findUnique({ where: { id: key }, select: { id: true } }),
  ]);
  return { count, liked: Boolean(current) };
}
