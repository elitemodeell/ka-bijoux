import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import { getSupabaseUser, isSupabaseAuthTransitionEnabled } from "./supabase-auth";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET não configurado nas variáveis de ambiente");

export interface CustomerPayload {
  id: string;
  email: string;
  name: string;
}

export interface AdminPayload {
  id: string;
  email: string;
  role: string;
}

// Legado temporário. Remover após a janela SUPABASE_AUTH_LEGACY_JWT_ACCEPT_UNTIL.
export function signCustomerToken(payload: CustomerPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d", algorithm: "HS256" });
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET! + "-admin", { expiresIn: "24h", algorithm: "HS256" });
}

export function verifyCustomerToken(token: string): CustomerPayload {
  return jwt.verify(token, JWT_SECRET!, { algorithms: ["HS256"] }) as CustomerPayload;
}

export function verifyAdminToken(token: string): AdminPayload {
  return jwt.verify(token, JWT_SECRET! + "-admin", { algorithms: ["HS256"] }) as AdminPayload;
}

function legacyCustomerJwtAllowed() {
  if (!isSupabaseAuthTransitionEnabled()) return true;
  const cutoff = process.env.SUPABASE_AUTH_LEGACY_JWT_ACCEPT_UNTIL?.trim();
  return Boolean(cutoff && Number.isFinite(Date.parse(cutoff)) && Date.now() < Date.parse(cutoff));
}

export async function getCustomerFromRequest(req: NextRequest): Promise<CustomerPayload | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);

  if (isSupabaseAuthTransitionEnabled()) {
    try {
      const { data, error } = await getSupabaseUser(token);
      if (!error && data.user) {
        const customer = await prisma.customer.findFirst({
          where: { authUserId: data.user.id, active: true },
          select: { id: true, email: true, name: true },
        });
        if (customer) return customer;
      }
    } catch {
      // A ponte legada abaixo só permanece ativa até a data de corte explícita.
    }
  }

  if (!legacyCustomerJwtAllowed()) return null;
  try {
    const payload = verifyCustomerToken(token);
    const customer = await prisma.customer.findFirst({
      where: { id: payload.id, active: true },
      select: { id: true, email: true, name: true },
    });
    return customer ?? null;
  } catch {
    return null;
  }
}

export async function requireCustomer(req: NextRequest) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) throw new Error("Não autorizado");
  return customer;
}

export async function getAdminFromRequest(req: NextRequest): Promise<AdminPayload | null> {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("ka-admin-token")?.value;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : cookieToken;
    if (!token) return null;
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}

export async function requireAdmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) throw new Error("Acesso não autorizado");

  const dbAdmin = await prisma.admin.findUnique({ where: { id: admin.id, active: true } });
  if (!dbAdmin) throw new Error("Admin não encontrado");
  return admin;
}
