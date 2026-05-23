import { ShippingType } from "@prisma/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

function isItaunaZipCode(zipCode: string): boolean {
  const clean = zipCode.replace(/\D/g, "");
  return ITAUNA_CEP_PREFIX.some((prefix) => clean.startsWith(prefix));
}

// ─── Cálculo de frete Correios (simulado / base para integração real) ─────────

function calculateCorreiosDimensions(items: ShippingItem[]) {
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

  // Peso mínimo dos Correios: 300g
  if (totalWeight < 0.3) totalWeight = 0.3;

  return { totalWeight, maxHeight, maxWidth, maxLength };
}

async function fetchCorreiosPrice(
  zipCode: string,
  dimensions: ReturnType<typeof calculateCorreiosDimensions>
): Promise<{ pac: number; sedex: number } | null> {
  // ─── Integração real com Melhor Envio ─────────────────────────────────────
  // Para produção, integrar com Melhor Envio ou API dos Correios.
  // Exemplo de endpoint: https://www.melhorenvio.com.br/api/v2/me/shipment/calculate
  //
  // Por enquanto, retorna estimativas baseadas em peso para desenvolvimento.
  // ─────────────────────────────────────────────────────────────────────────

  const { totalWeight } = dimensions;
  const basePrice = totalWeight * 10; // R$ 10 por kg como estimativa

  return {
    pac: Math.max(15.0, basePrice * 0.8),
    sedex: Math.max(25.0, basePrice * 1.4),
  };
}

// ─── Função principal: calcular todas as opções de frete ─────────────────────

export async function calculateShipping(
  zipCode: string,
  items: ShippingItem[],
  config: StoreShippingConfig
): Promise<ShippingOption[]> {
  const options: ShippingOption[] = [];
  const cleanZip = zipCode.replace(/\D/g, "");
  const isItauna = isItaunaZipCode(cleanZip);

  // 1. Retirada na loja (sempre disponível se habilitada)
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

  // 2. Mototáxi (apenas para Itaúna/MG)
  if (config.mototaxiEnabled && isItauna) {
    options.push({
      type: ShippingType.MOTOTAXI,
      name: "Entrega Local - Mototáxi",
      description: "Entrega em Itaúna/MG por mototáxi. Prazo: mesmo dia ou dia seguinte.",
      price: config.mototaxiPrice,
      estimatedDays: 1,
      available: true,
    });
  }

  // 3. Correios (disponível para qualquer CEP)
  if (config.correiosEnabled && cleanZip.length === 8) {
    const dimensions = calculateCorreiosDimensions(items);
    const correiosPrice = await fetchCorreiosPrice(cleanZip, dimensions);

    if (correiosPrice) {
      options.push({
        type: ShippingType.CORREIOS,
        name: "PAC - Correios",
        description: `Envio pelos Correios (PAC). Prazo estimado: 5-10 dias úteis.`,
        price: parseFloat(correiosPrice.pac.toFixed(2)),
        estimatedDays: 8,
        available: true,
      });

      options.push({
        type: ShippingType.CORREIOS,
        name: "SEDEX - Correios",
        description: `Envio expresso pelos Correios (SEDEX). Prazo estimado: 2-4 dias úteis.`,
        price: parseFloat(correiosPrice.sedex.toFixed(2)),
        estimatedDays: 3,
        available: true,
      });
    } else {
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
