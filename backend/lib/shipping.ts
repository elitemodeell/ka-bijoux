import { ShippingType } from "@prisma/client";

export interface ShippingItem {
  weight: number;   // kg
  height: number;   // cm
  width: number;    // cm
  length: number;   // cm
  quantity: number;
}

export interface ShippingOption {
  type: ShippingType;
  name: string;
  description: string;
  price: number;
  estimatedDays?: number;
  available: boolean;
}

export interface StoreShippingConfig {
  correiosEnabled: boolean;
  mototaxiEnabled: boolean;
  storePickupEnabled: boolean;
  mototaxiPrice: number;
}

const ITAUNA_CEP_PREFIX = ["35680", "35681", "35682", "35683", "35684", "35685"];
const ORIGIN_ZIP = "35680000"; // Itaúna/MG

function isItaunaZipCode(zipCode: string): boolean {
  const clean = zipCode.replace(/\D/g, "");
  return ITAUNA_CEP_PREFIX.some((prefix) => clean.startsWith(prefix));
}

function consolidateDimensions(items: ShippingItem[]) {
  let totalWeight = 0;
  let maxHeight = 0;
  let maxWidth = 0;
  let maxLength = 0;

  for (const item of items) {
    totalWeight += item.weight * item.quantity;
    maxHeight = Math.max(maxHeight, item.height);
    maxWidth = Math.max(maxWidth, item.width);
    maxLength = Math.max(maxLength, item.length);
  }

  if (totalWeight < 0.3) totalWeight = 0.3;
  return { totalWeight, maxHeight, maxWidth, maxLength };
}

// ─── Melhor Envio API ────────────────────────────────────────────────────────
// Docs: https://docs.melhorenvio.com.br/reference/calculate-shipping
// Serviços: 1=PAC, 2=SEDEX, 3=SEDEX 10, 4=SEDEX Hoje, 17=Mini Envios

interface MelhorEnvioResult {
  id: number;
  name: string;
  price?: string | null;
  delivery_time?: number;
  error?: string;
}

async function fetchMelhorEnvioRates(
  destinationZip: string,
  dims: ReturnType<typeof consolidateDimensions>
): Promise<{ pac: number | null; sedex: number | null; pacDays: number; sedexDays: number }> {
  const token = process.env.MELHOR_ENVIO_TOKEN;

  if (!token) {
    // Mock: estimativa por peso para dev
    const base = dims.totalWeight * 10;
    return { pac: Math.max(15, base * 0.8), sedex: Math.max(25, base * 1.4), pacDays: 8, sedexDays: 3 };
  }

  try {
    const body = {
      from: { postal_code: ORIGIN_ZIP.replace(/\D/g, "") },
      to: { postal_code: destinationZip.replace(/\D/g, "") },
      package: {
        height: Math.max(2, dims.maxHeight),
        width: Math.max(11, dims.maxWidth),
        length: Math.max(16, dims.maxLength),
        weight: dims.totalWeight,
      },
      options: { receipt: false, own_hand: false },
      services: "1,2", // 1=PAC, 2=SEDEX
    };

    const res = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "KABijoux/1.0 (contato@kabijoux.com.br)",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`ME API ${res.status}`);

    const results: MelhorEnvioResult[] = await res.json();
    const pac = results.find((r) => r.id === 1);
    const sedex = results.find((r) => r.id === 2);

    return {
      pac: pac?.price && !pac.error ? parseFloat(pac.price) : null,
      sedex: sedex?.price && !sedex.error ? parseFloat(sedex.price) : null,
      pacDays: pac?.delivery_time ?? 8,
      sedexDays: sedex?.delivery_time ?? 3,
    };
  } catch (err) {
    console.error("Melhor Envio error:", err);
    // Fallback para mock se a API falhar
    const base = dims.totalWeight * 10;
    return { pac: Math.max(15, base * 0.8), sedex: Math.max(25, base * 1.4), pacDays: 8, sedexDays: 3 };
  }
}

// ─── Função principal ─────────────────────────────────────────────────────────

export async function calculateShipping(
  zipCode: string,
  items: ShippingItem[],
  config: StoreShippingConfig
): Promise<ShippingOption[]> {
  const options: ShippingOption[] = [];
  const cleanZip = zipCode.replace(/\D/g, "");
  const isItauna = isItaunaZipCode(cleanZip);

  if (config.storePickupEnabled) {
    options.push({
      type: ShippingType.RETIRADA,
      name: "Retirada na Loja",
      description: "Retirada na loja KA Bijoux em Itaúna/MG",
      price: 0,
      estimatedDays: 0,
      available: true,
    });
  }

  if (config.mototaxiEnabled && isItauna) {
    options.push({
      type: ShippingType.MOTOTAXI,
      name: "Entrega Local — Mototáxi",
      description: "Entrega em Itaúna/MG por mototáxi. Prazo: mesmo dia ou dia seguinte.",
      price: config.mototaxiPrice,
      estimatedDays: 1,
      available: true,
    });
  }

  if (config.correiosEnabled && cleanZip.length === 8) {
    const dims = consolidateDimensions(items);
    const rates = await fetchMelhorEnvioRates(cleanZip, dims);

    if (rates.pac !== null) {
      options.push({
        type: ShippingType.CORREIOS,
        name: "PAC — Correios",
        description: `Envio pelos Correios (PAC). Prazo estimado: ${rates.pacDays} dias úteis.`,
        price: parseFloat(rates.pac.toFixed(2)),
        estimatedDays: rates.pacDays,
        available: true,
      });
    }

    if (rates.sedex !== null) {
      options.push({
        type: ShippingType.CORREIOS,
        name: "SEDEX — Correios",
        description: `Envio expresso pelos Correios (SEDEX). Prazo estimado: ${rates.sedexDays} dias úteis.`,
        price: parseFloat(rates.sedex.toFixed(2)),
        estimatedDays: rates.sedexDays,
        available: true,
      });
    }

    if (rates.pac === null && rates.sedex === null) {
      options.push({
        type: ShippingType.CORREIOS,
        name: "Correios",
        description: "Não foi possível calcular o frete para este CEP.",
        price: 0,
        available: false,
      });
    }
  }

  return options;
}

export { isItaunaZipCode };
