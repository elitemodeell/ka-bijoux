import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

async function getOrCreateSettings() {
  const existing = await prisma.storeSettings.findFirst();
  if (existing) return existing;
  return prisma.storeSettings.create({ data: {} });
}

// GET /api/admin/settings
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const settings = await getOrCreateSettings();
    return apiSuccess(settings);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao buscar configurações.", 500);
  }
}

// PATCH /api/admin/settings
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();

    const settings = await getOrCreateSettings();

    const allowed = [
      "storeName", "storeAddress", "storeCity", "storeState", "storeZipCode",
      "storePhone", "storeEmail", "storeHours",
      "mototaxiPrice", "mototaxiEnabled", "correiosEnabled", "storePickupEnabled",
      "shippingPackageWeight", "shippingPackageHeight", "shippingPackageWidth", "shippingPackageLength", "shippingHandlingDays",
      "logoUrl",
    ];

    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key];
      }
    }

    if (typeof data.mototaxiPrice === "string") {
      data.mototaxiPrice = parseFloat(data.mototaxiPrice as string);
    }
    for (const key of ["shippingPackageWeight", "shippingPackageHeight", "shippingPackageWidth", "shippingPackageLength"]) {
      if (typeof data[key] === "string") data[key] = data[key] === "" ? null : Number(data[key]);
      if (data[key] !== null && data[key] !== undefined && (!Number.isFinite(data[key]) || Number(data[key]) <= 0)) return apiError("Peso e dimensões da embalagem devem ser positivos.", 422);
    }
    if (typeof data.shippingHandlingDays === "string") data.shippingHandlingDays = Number(data.shippingHandlingDays);
    if (data.shippingHandlingDays !== undefined && (!Number.isInteger(data.shippingHandlingDays) || Number(data.shippingHandlingDays) < 0 || Number(data.shippingHandlingDays) > 30)) return apiError("Prazo de preparação inválido.", 422);

    const updated = await prisma.storeSettings.update({
      where: { id: settings.id },
      data,
    });

    return apiSuccess(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Erro ao salvar configurações.", 500);
  }
}
