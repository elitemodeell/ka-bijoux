import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, type Customer } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const authUserIdSchema = z.string().uuid();
const emailSchema = z.string().trim().toLowerCase().email().max(320);

const customerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  active: true,
  authUserId: true,
} satisfies Prisma.CustomerSelect;

type LinkedCustomer = Pick<
  Customer,
  "id" | "name" | "email" | "phone" | "active" | "authUserId"
>;

export type GoogleCustomerLinkResult = {
  customer: LinkedCustomer;
  created: boolean;
  linked: boolean;
};

export class GoogleCustomerLinkError extends Error {
  constructor(
    public readonly code:
      | "invalid_identity"
      | "email_not_confirmed"
      | "customer_inactive"
      | "customer_conflict",
    public readonly status: 401 | 403 | 409
  ) {
    super(code);
    this.name = "GoogleCustomerLinkError";
  }
}

function normalizedSocialIdentity(user: User, provider: "google" | "apple") {
  const authUserId = authUserIdSchema.safeParse(user.id);
  const email = emailSchema.safeParse(user.email);
  const providerIdentity = user.identities?.find(
    (identity) => identity.provider?.toLowerCase() === provider
  );

  if (!authUserId.success || !email.success || !providerIdentity) {
    throw new GoogleCustomerLinkError("invalid_identity", 401);
  }
  if (!user.email_confirmed_at) {
    throw new GoogleCustomerLinkError("email_not_confirmed", 403);
  }

  return {
    authUserId: authUserId.data,
    email: email.data,
    name: socialDisplayName(user, providerIdentity.identity_data),
  };
}

function socialDisplayName(user: User, identityData: Record<string, unknown> | undefined) {
  const candidates = [
    identityData?.full_name,
    identityData?.name,
    user.user_metadata?.full_name,
    user.user_metadata?.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const normalized = candidate.trim().replace(/\s+/g, " ").slice(0, 120);
    if (normalized.length >= 2) return normalized;
  }
  return "Cliente KA Bijoux";
}

function assertActive(customer: LinkedCustomer) {
  if (!customer.active) {
    throw new GoogleCustomerLinkError("customer_inactive", 403);
  }
}

function assertSameAuthUser(customer: LinkedCustomer, authUserId: string) {
  if (customer.authUserId && customer.authUserId !== authUserId) {
    throw new GoogleCustomerLinkError("customer_conflict", 409);
  }
}

async function loadSingleCustomerByEmail(email: string) {
  const matches = await prisma.customer.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: customerSelect,
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  if (matches.length > 1) {
    throw new GoogleCustomerLinkError("customer_conflict", 409);
  }
  return matches[0] ?? null;
}

async function claimExistingCustomer(customer: LinkedCustomer, authUserId: string) {
  assertActive(customer);
  assertSameAuthUser(customer, authUserId);
  if (customer.authUserId === authUserId) return customer;

  const claimed = await prisma.customer.updateMany({
    where: { id: customer.id, active: true, authUserId: null },
    data: { authUserId, authMigratedAt: new Date() },
  });
  if (claimed.count === 1) return { ...customer, authUserId };

  // Outra requisição pode ter concluído a mesma vinculação em paralelo.
  const current = await prisma.customer.findUnique({
    where: { id: customer.id },
    select: customerSelect,
  });
  if (!current) throw new GoogleCustomerLinkError("customer_conflict", 409);
  assertActive(current);
  assertSameAuthUser(current, authUserId);
  if (current.authUserId !== authUserId) {
    throw new GoogleCustomerLinkError("customer_conflict", 409);
  }
  return current;
}

async function createSocialCustomer(input: {
  authUserId: string;
  email: string;
  name: string;
}) {
  // O schema legado ainda exige passwordHash. O valor aleatório nunca é exposto
  // nem usado como credencial; uma recuperação futura substitui o hash normalmente.
  const unusablePassword = randomBytes(48).toString("base64url");
  const passwordHash = await bcrypt.hash(unusablePassword, 12);

  try {
    return await prisma.customer.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        authUserId: input.authUserId,
        authMigratedAt: new Date(),
      },
      select: customerSelect,
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }

    // Idempotência/race: uma criação concorrente pode ter vencido a restrição única.
    const byAuthUser = await prisma.customer.findUnique({
      where: { authUserId: input.authUserId },
      select: customerSelect,
    });
    if (byAuthUser) {
      assertActive(byAuthUser);
      return byAuthUser;
    }
    const byEmail = await loadSingleCustomerByEmail(input.email);
    if (!byEmail) throw new GoogleCustomerLinkError("customer_conflict", 409);
    return claimExistingCustomer(byEmail, input.authUserId);
  }
}

/**
 * Vincula uma identidade Google validada pelo Supabase ao perfil comercial.
 * O Customer existente é sempre reutilizado; portanto seus pedidos, endereços,
 * carrinho e histórico continuam associados ao mesmo Customer.id.
 */
export async function completeGoogleCustomerLink(
  user: User
): Promise<GoogleCustomerLinkResult> {
  return completeSocialCustomerLink(user, "google");
}

export async function completeAppleCustomerLink(
  user: User
): Promise<GoogleCustomerLinkResult> {
  return completeSocialCustomerLink(user, "apple");
}

async function completeSocialCustomerLink(
  user: User,
  provider: "google" | "apple",
): Promise<GoogleCustomerLinkResult> {
  const identity = normalizedSocialIdentity(user, provider);

  const byAuthUser = await prisma.customer.findUnique({
    where: { authUserId: identity.authUserId },
    select: customerSelect,
  });
  if (byAuthUser) {
    assertActive(byAuthUser);
    return { customer: byAuthUser, created: false, linked: false };
  }

  const byEmail = await loadSingleCustomerByEmail(identity.email);
  if (byEmail) {
    const customer = await claimExistingCustomer(byEmail, identity.authUserId);
    return { customer, created: false, linked: true };
  }

  const customer = await createSocialCustomer(identity);
  return { customer, created: true, linked: true };
}

export function publicGoogleCustomer(customer: LinkedCustomer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
  };
}
