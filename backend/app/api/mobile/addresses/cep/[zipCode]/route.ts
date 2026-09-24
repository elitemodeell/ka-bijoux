import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { lookupBrazilianPostalCode } from "@/lib/address";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(req: NextRequest, props: { params: Promise<{ zipCode: string }> }) {
  const params = await props.params;
  try {
    await requireCustomer(req);
    const cleanZip = params.zipCode.replace(/\D/g, "");
    if (cleanZip.length !== 8) return apiError("Informe um CEP válido com 8 dígitos.", 422);
    const address = await lookupBrazilianPostalCode(cleanZip);
    if (!address) return apiError("CEP não encontrado ou serviço de CEP indisponível.", 404);
    return apiSuccess(address);
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Não foi possível consultar o CEP.", 503);
  }
}
