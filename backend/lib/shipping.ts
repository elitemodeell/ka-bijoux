import { ShippingType } from "@prisma/client";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

export interface ShippingItem {
  weight: number;
  height: number;
  width: number;
  length: number;
  quantity: number;
  declaredValue: number;
}

export interface ShippingOption {
  id: string;
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
  storeAddress?: string;
  storeCity?: string;
  storeState?: string;
  storeZipCode?: string;
  packageWeight?: number | null;
  packageHeight?: number | null;
  packageWidth?: number | null;
  packageLength?: number | null;
  handlingDays?: number;
}

export interface ShippingDestination {
  city: string;
  state: string;
}

type NationalShippingConfig = Pick<
  StoreShippingConfig,
  | "correiosEnabled"
  | "storeZipCode"
  | "packageWeight"
  | "packageHeight"
  | "packageWidth"
  | "packageLength"
  | "handlingDays"
>;

const ITAUNA_CEP_PREFIX = ["35680", "35681", "35682", "35683", "35684", "35685"];

export const SHIPPING_OPTION_IDS = {
  pickup: "pickup",
  mototaxi: "mototaxi",
  pac: "melhor-envio:1",
  sedex: "melhor-envio:2",
} as const;

export function isItaunaZipCode(zipCode: string): boolean {
  const clean = zipCode.replace(/\D/g, "");
  return ITAUNA_CEP_PREFIX.some((prefix) => clean.startsWith(prefix));
}

function normalizeLocation(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

export function isItaunaDestination(destination?: ShippingDestination): boolean {
  return Boolean(
    destination &&
      normalizeLocation(destination.city) === "itauna" &&
      destination.state.trim().toUpperCase() === "MG"
  );
}

function requirePositive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Dimensão de frete inválida no catálogo: ${field}.`);
  }
  return value;
}

function consolidateDimensions(items: ShippingItem[], config: StoreShippingConfig) {
  if (items.length === 0) throw new Error("Não há itens para calcular o frete.");

  let totalWeight = 0;
  let maxHeight = 0;
  let maxWidth = 0;
  let maxLength = 0;
  let totalVolume = 0;
  let declaredValue = 0;

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error("Quantidade inválida para cálculo de frete.");
    }
    totalWeight += requirePositive(item.weight, "peso") * item.quantity;
    maxHeight = Math.max(maxHeight, requirePositive(item.height, "altura"));
    maxWidth = Math.max(maxWidth, requirePositive(item.width, "largura"));
    maxLength = Math.max(maxLength, requirePositive(item.length, "comprimento"));
    totalVolume += item.height * item.width * item.length * item.quantity;
    declaredValue += requirePositive(item.declaredValue, "valor declarado") * item.quantity;
  }

  const packageWeight = requirePositive(Number(config.packageWeight), "peso da embalagem");
  const packageHeight = requirePositive(Number(config.packageHeight), "altura da embalagem");
  const packageWidth = requirePositive(Number(config.packageWidth), "largura da embalagem");
  const packageLength = requirePositive(Number(config.packageLength), "comprimento da embalagem");
  const packedWidth = Math.max(packageWidth, maxWidth);
  const packedLength = Math.max(packageLength, maxLength);
  const packedHeight = Math.max(packageHeight, maxHeight, Math.ceil(totalVolume / (packedWidth * packedLength)));

  return {
    totalWeight: totalWeight + packageWeight,
    maxHeight: packedHeight,
    maxWidth: packedWidth,
    maxLength: packedLength,
    declaredValue,
  };
}

export function isNationalShippingConfigured(config: NationalShippingConfig): boolean {
  const environment = process.env.MELHOR_ENVIO_SANDBOX?.trim().toLowerCase();
  const originZip = (config.storeZipCode ?? "").replace(/\D/g, "");
  const handlingDays = Number(config.handlingDays);
  const packageValues = [
    config.packageWeight,
    config.packageHeight,
    config.packageWidth,
    config.packageLength,
  ].map(Number);

  return Boolean(
    config.correiosEnabled &&
      process.env.MELHOR_ENVIO_TOKEN?.trim() &&
      (environment === "true" || environment === "false") &&
      originZip.length === 8 &&
      Number.isInteger(handlingDays) &&
      handlingDays >= 0 &&
      packageValues.every((value) => Number.isFinite(value) && value > 0)
  );
}

interface MelhorEnvioResult {
  id: number;
  price?: string | null;
  delivery_time?: number;
  error?: string;
}

interface MelhorEnvioRates {
  pac: number | null;
  sedex: number | null;
  pacDays: number;
  sedexDays: number;
  unavailableReason?: string;
}

function validRate(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function fetchMelhorEnvioRates(
  destinationZip: string,
  originZip: string,
  dims: ReturnType<typeof consolidateDimensions>,
  handlingDays: number
): Promise<MelhorEnvioRates> {
  const token = process.env.MELHOR_ENVIO_TOKEN?.trim();
  const rawSandbox = process.env.MELHOR_ENVIO_SANDBOX?.trim().toLowerCase();

  // Nunca invente preço nem ambiente de frete. Ambos são explícitos.
  if (!token || (rawSandbox !== "true" && rawSandbox !== "false")) {
    return {
      pac: null,
      sedex: null,
      pacDays: 0,
      sedexDays: 0,
      unavailableReason: "Serviço de frete temporariamente indisponível.",
    };
  }

  const baseUrl =
    rawSandbox === "true"
      ? "https://sandbox.melhorenvio.com.br"
      : "https://melhorenvio.com.br";
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 10_000);

  try {
    const response = await fetch(
      `${baseUrl}/api/v2/me/shipment/calculate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": `KABijoux/1.0 (${LEGAL_IDENTITY.email})`,
        },
        signal: abortController.signal,
        body: JSON.stringify({
          from: { postal_code: originZip },
          to: { postal_code: destinationZip },
          package: {
            height: dims.maxHeight,
            width: dims.maxWidth,
            length: dims.maxLength,
            weight: dims.totalWeight,
          },
          options: { receipt: false, own_hand: false, insurance_value: Number(dims.declaredValue.toFixed(2)) },
          services: "1,2",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Melhor Envio respondeu HTTP ${response.status}`);
    }

    const results = (await response.json()) as MelhorEnvioResult[];
    const pac = results.find((result) => Number(result.id) === 1);
    const sedex = results.find((result) => Number(result.id) === 2);

    return {
      pac: pac?.error ? null : validRate(pac?.price),
      sedex: sedex?.error ? null : validRate(sedex?.price),
      pacDays: (pac?.delivery_time ?? 0) + handlingDays,
      sedexDays: (sedex?.delivery_time ?? 0) + handlingDays,
      unavailableReason:
        pac?.error && sedex?.error
          ? "Os serviços PAC e SEDEX não estão disponíveis para este CEP."
          : undefined,
    };
  } catch (error) {
    console.error(
      "Não foi possível consultar o Melhor Envio:",
      error instanceof Error ? error.message : "erro desconhecido"
    );
    return {
      pac: null,
      sedex: null,
      pacDays: 0,
      sedexDays: 0,
      unavailableReason: "Não foi possível consultar o frete agora.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function calculateShipping(
  zipCode: string,
  items: ShippingItem[],
  config: StoreShippingConfig,
  destination?: ShippingDestination
): Promise<ShippingOption[]> {
  const options: ShippingOption[] = [];
  const cleanZip = zipCode.replace(/\D/g, "");
  const isItauna = destination ? isItaunaDestination(destination) : isItaunaZipCode(cleanZip);

  if (config.storePickupEnabled) {
    options.push({
      id: SHIPPING_OPTION_IDS.pickup,
      type: ShippingType.RETIRADA,
      name: "Retirada na Loja",
      description: [
        config.storeAddress,
        config.storeCity && config.storeState ? `${config.storeCity}/${config.storeState}` : undefined,
        config.storeZipCode ? `CEP ${config.storeZipCode}` : undefined,
      ].filter(Boolean).join(" — ") || "Retirada na loja KA Bijoux em Itaúna/MG",
      price: 0,
      estimatedDays: 0,
      available: true,
    });
  }

  if (config.mototaxiEnabled && isItauna) {
    const mototaxiPrice = Number(config.mototaxiPrice);
    if (Number.isFinite(mototaxiPrice) && mototaxiPrice > 0) {
      options.push({
        id: SHIPPING_OPTION_IDS.mototaxi,
        type: ShippingType.MOTOTAXI,
        name: "Entrega Local — Mototáxi",
        description: "Entrega em Itaúna/MG por mototáxi.",
        price: Number(mototaxiPrice.toFixed(2)),
        estimatedDays: 1,
        available: true,
      });
    }
  }

  if (config.correiosEnabled && cleanZip.length === 8) {
    // O frete nacional permanece oculto ao cliente até que toda a configuração
    // real esteja válida. Nunca exponha uma opção sem preço ou estimativa.
    if (!isNationalShippingConfigured(config)) return options;

    const originZip = (config.storeZipCode ?? "").replace(/\D/g, "");
    const handlingDays = Number(config.handlingDays ?? 0);
    let dimensions: ReturnType<typeof consolidateDimensions>;
    try {
      dimensions = consolidateDimensions(items, config);
    } catch {
      return options;
    }
    const rates = await fetchMelhorEnvioRates(cleanZip, originZip, dimensions, handlingDays);

    if (rates.pac !== null) {
      options.push({
        id: SHIPPING_OPTION_IDS.pac,
        type: ShippingType.CORREIOS,
        name: "PAC — Correios",
        description: `Envio pelos Correios (PAC). Prazo estimado: ${rates.pacDays} dias úteis.`,
        price: Number(rates.pac.toFixed(2)),
        estimatedDays: rates.pacDays,
        available: true,
      });
    }

    if (rates.sedex !== null) {
      options.push({
        id: SHIPPING_OPTION_IDS.sedex,
        type: ShippingType.CORREIOS,
        name: "SEDEX — Correios",
        description: `Envio expresso pelos Correios (SEDEX). Prazo estimado: ${rates.sedexDays} dias úteis.`,
        price: Number(rates.sedex.toFixed(2)),
        estimatedDays: rates.sedexDays,
        available: true,
      });
    }

  }

  return options;
}
