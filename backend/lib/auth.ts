import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "ka-bijoux-secret-dev";

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

export function signCustomerToken(payload: CustomerPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function signAdminToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET + "-admin", { expiresIn: "24h" });
}

export function verifyCustomerToken(token: string): CustomerPayload {
  return jwt.verify(token, JWT_SECRET) as CustomerPayload;
}

export function verifyAdminToken(token: string): AdminPayload {
  return jwt.verify(token, JWT_SECRET + "-admin") as AdminPayload;
}

export async function getCustomerFromRequest(
  req: NextRequest
): Promise<CustomerPayload | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    return verifyCustomerToken(token);
  } catch {
    return null;
  }
}

export async function requireCustomer(req: NextRequest) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) throw new Error("Não autorizado");
  return customer;
}

export async function getAdminFromRequest(
  req: NextRequest
): Promise<AdminPayload | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.substring(7);
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}

export async function requireAdmin(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) throw new Error("Acesso não autorizado");

  const dbAdmin = await prisma.admin.findUnique({
    where: { id: admin.id, active: true },
  });
  if (!dbAdmin) throw new Error("Admin não encontrado");

  return admin;
}
