import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

const STATE_CODES: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapá: "AP", amazonas: "AM", bahia: "BA", ceará: "CE",
  "distrito federal": "DF", "espírito santo": "ES", goiás: "GO", maranhão: "MA",
  "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", pará: "PA",
  paraíba: "PB", paraná: "PR", pernambuco: "PE", piauí: "PI", "rio de janeiro": "RJ",
  "rio grande do norte": "RN", "rio grande do sul": "RS", rondônia: "RO", roraima: "RR",
  "santa catarina": "SC", "são paulo": "SP", sergipe: "SE", tocantins: "TO",
};

export async function GET(req: NextRequest) {
  try {
    await requireCustomer(req);
    const latitude = Number(req.nextUrl.searchParams.get("latitude"));
    const longitude = Number(req.nextUrl.searchParams.get("longitude"));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return apiError("Coordenadas inválidas.", 422);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${latitude}&lon=${longitude}`, {
        signal: controller.signal,
        headers: { Accept: "application/json", "Accept-Language": "pt-BR", "User-Agent": "KABijoux/1.0 (https://kabijoux.com.br)" },
        cache: "no-store",
      });
      if (!response.ok) return apiError("Serviço de endereço indisponível.", 503);
      const payload = await response.json() as { address?: Record<string, string> };
      const address = payload.address ?? {};
      const state = address["ISO3166-2-lvl4"]?.split("-").pop() || STATE_CODES[address.state?.toLowerCase()] || "";
      return apiSuccess({
        zipCode: (address.postcode ?? "").replace(/\D/g, "").slice(0, 8),
        street: address.road || address.pedestrian || address.residential || "",
        neighborhood: address.suburb || address.neighbourhood || address.quarter || "",
        city: address.city || address.town || address.municipality || address.village || "",
        state,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Não autorizado") return apiError("Não autorizado.", 401);
    return apiError("Não foi possível identificar o endereço.", 503);
  }
}
