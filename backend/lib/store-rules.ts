export const INTEREST_FREE_MIN_AMOUNT = 150;
export const MAX_INTEREST_FREE_INSTALLMENTS = 3;

export type InstallmentInfo = {
  eligible: boolean;
  installments: number | null;
  installmentValue: number | null;
  label: string;
};

export function getInstallmentInfo(amount: number): InstallmentInfo {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;

  if (safeAmount < INTEREST_FREE_MIN_AMOUNT) {
    return {
      eligible: false,
      installments: null,
      installmentValue: null,
      label: "Consulte opções de pagamento no checkout",
    };
  }

  return {
    eligible: true,
    installments: MAX_INTEREST_FREE_INSTALLMENTS,
    installmentValue: safeAmount / MAX_INTEREST_FREE_INSTALLMENTS,
    label: `até ${MAX_INTEREST_FREE_INSTALLMENTS}x sem juros`,
  };
}

export function getValidPromotionalPrice(
  originalPrice: number,
  promotionalPrice: number | string | null | undefined
) {
  const currentPrice = Number(promotionalPrice);
  if (
    !Number.isFinite(originalPrice) ||
    originalPrice <= 0 ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    currentPrice >= originalPrice
  ) {
    return null;
  }
  return currentPrice;
}

export function getDiscountPercentage({
  originalPrice,
  currentPrice,
  manualPercentage,
}: {
  originalPrice: number;
  currentPrice?: number | null;
  manualPercentage?: number | string | null;
}) {
  const manual = Number(manualPercentage);
  if (Number.isFinite(manual) && manual > 0 && manual < 100) {
    return Math.round(manual);
  }

  if (
    !Number.isFinite(originalPrice) ||
    !Number.isFinite(currentPrice) ||
    !currentPrice ||
    originalPrice <= 0 ||
    currentPrice >= originalPrice
  ) {
    return null;
  }

  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}
