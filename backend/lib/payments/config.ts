import {
  PaymentConfigurationError,
  type PaymentProviderId,
  type ProviderPaymentMethod,
} from "./types";

export type AsaasEnvironment = "sandbox" | "production";

export interface AsaasPaymentConfig {
  provider: "ASAAS";
  environment: AsaasEnvironment;
  baseUrl: string;
  apiKey: string;
  userAgent: string;
  expectedAccount: {
    legalName: string;
    cpfCnpj: string;
    walletId: string;
  };
}

export type PaymentEnvironmentVariables = Readonly<Record<string, string | undefined>>;

export interface PaymentRoutingConfig {
  defaultProvider: PaymentProviderId;
  providersByMethod: Record<ProviderPaymentMethod, PaymentProviderId>;
}

export interface AsaasFeatureConfig {
  enabledMethods: Record<ProviderPaymentMethod, boolean>;
  maxInstallments: number;
  pixDueDays: number;
  boletoDueDays: number;
  checkoutMinutesToExpire: number;
  checkoutReturnUrl: string;
}

const ASAAS_BASE_URLS: Record<AsaasEnvironment, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
};

function required(env: PaymentEnvironmentVariables, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new PaymentConfigurationError(`${name} não configurado.`);
  }
  return value;
}

export function loadPaymentConfig(
  env: PaymentEnvironmentVariables = process.env
): AsaasPaymentConfig {
  const provider =
    env["PAYMENT_DEFAULT_PROVIDER"]?.trim() ||
    required(env, "PAYMENT_PROVIDER");
  if (provider !== "ASAAS") {
    throw new PaymentConfigurationError(
      provider === "MERCADO_PAGO"
        ? "MERCADO_PAGO não possui implementação ativa."
        : `PAYMENT_PROVIDER inválido: ${provider}.`
    );
  }

  const rawEnvironment = required(env, "ASAAS_ENVIRONMENT");
  if (rawEnvironment !== "sandbox" && rawEnvironment !== "production") {
    throw new PaymentConfigurationError(
      "ASAAS_ENVIRONMENT deve ser sandbox ou production."
    );
  }
  const environment: AsaasEnvironment = rawEnvironment;
  const apiKey = required(env, "ASAAS_API_KEY");
  const expectedLegalName = required(env, "ASAAS_EXPECTED_LEGAL_NAME");
  const expectedCpfCnpj = required(env, "ASAAS_EXPECTED_CPF_CNPJ").replace(/\D/g, "");
  const expectedWalletId = required(env, "ASAAS_EXPECTED_WALLET_ID");
  if (expectedCpfCnpj.length !== 14) {
    throw new PaymentConfigurationError(
      "ASAAS_EXPECTED_CPF_CNPJ deve conter um CNPJ com 14 dÃ­gitos."
    );
  }
  if (expectedWalletId.length < 8 || expectedWalletId.length > 100) {
    throw new PaymentConfigurationError(
      "ASAAS_EXPECTED_WALLET_ID possui formato invÃ¡lido."
    );
  }

  // Chaves sintéticas continuam válidas em testes com fetch injetado. Quando a
  // chave usa o formato oficial, impedimos a combinação acidental de ambientes.
  if (apiKey.startsWith("$aact_prod_") && environment !== "production") {
    throw new PaymentConfigurationError(
      "Chave Asaas de produção não pode ser usada no Sandbox."
    );
  }
  if (apiKey.startsWith("$aact_hmlg_") && environment !== "sandbox") {
    throw new PaymentConfigurationError(
      "Chave Asaas de Sandbox não pode ser usada em produção."
    );
  }

  const syntheticTestKeyAllowed =
    env["NODE_ENV"] === "test" && environment === "sandbox";
  if (environment === "production" && !apiKey.startsWith("$aact_prod_")) {
    throw new PaymentConfigurationError(
      "Produção exige uma chave Asaas com prefixo $aact_prod_."
    );
  }
  if (
    environment === "sandbox" &&
    !apiKey.startsWith("$aact_hmlg_") &&
    !syntheticTestKeyAllowed
  ) {
    throw new PaymentConfigurationError(
      "Sandbox exige chave $aact_hmlg_; chave sintética é permitida somente em teste."
    );
  }
  return Object.freeze({
    provider: "ASAAS" as const,
    environment,
    baseUrl: ASAAS_BASE_URLS[environment],
    apiKey,
    userAgent: `KA-Bijoux/1.0 (Node.js; ${environment})`,
    expectedAccount: Object.freeze({
      legalName: expectedLegalName,
      cpfCnpj: expectedCpfCnpj,
      walletId: expectedWalletId,
    }),
  });
}

function providerValue(
  env: PaymentEnvironmentVariables,
  name: string,
  fallback?: string
): PaymentProviderId {
  const value = env[name]?.trim() || fallback;
  if (value !== "ASAAS" && value !== "MERCADO_PAGO") {
    throw new PaymentConfigurationError(`${name} deve ser ASAAS ou MERCADO_PAGO.`);
  }
  if (value === "MERCADO_PAGO") {
    throw new PaymentConfigurationError(
      `MERCADO_PAGO configurado em ${name}, mas não possui implementação ativa.`
    );
  }
  return value;
}

export function loadPaymentRoutingConfig(
  env: PaymentEnvironmentVariables = process.env
): PaymentRoutingConfig {
  // PAYMENT_PROVIDER permanece aceito apenas como compatibilidade explícita.
  const legacy = env["PAYMENT_PROVIDER"]?.trim();
  const defaultProvider = providerValue(
    env,
    "PAYMENT_DEFAULT_PROVIDER",
    legacy
  );
  return Object.freeze({
    defaultProvider,
    providersByMethod: Object.freeze({
      PIX: providerValue(env, "PAYMENT_PIX_PROVIDER", defaultProvider),
      CREDIT_CARD: providerValue(env, "PAYMENT_CARD_PROVIDER", defaultProvider),
      BOLETO: providerValue(env, "PAYMENT_BOLETO_PROVIDER", defaultProvider),
    }),
  });
}

function booleanFlag(
  env: PaymentEnvironmentVariables,
  name: string
): boolean {
  const value = required(env, name).toLowerCase();
  if (value !== "true" && value !== "false") {
    throw new PaymentConfigurationError(`${name} deve ser true ou false.`);
  }
  return value === "true";
}

function integerInRange(
  env: PaymentEnvironmentVariables,
  name: string,
  min: number,
  max: number
): number {
  const value = Number(required(env, name));
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new PaymentConfigurationError(`${name} deve estar entre ${min} e ${max}.`);
  }
  return value;
}

export function loadAsaasFeatureConfig(
  env: PaymentEnvironmentVariables = process.env
): AsaasFeatureConfig {
  const checkoutReturnUrl = required(env, "PAYMENT_CHECKOUT_RETURN_URL");
  let parsed: URL;
  try {
    parsed = new URL(checkoutReturnUrl);
  } catch {
    throw new PaymentConfigurationError(
      "PAYMENT_CHECKOUT_RETURN_URL deve ser uma URL válida."
    );
  }
  const localTestUrl =
    env["NODE_ENV"] === "test" && parsed.hostname === "localhost";
  if (parsed.protocol !== "https:" && !localTestUrl) {
    throw new PaymentConfigurationError(
      "PAYMENT_CHECKOUT_RETURN_URL deve usar HTTPS."
    );
  }

  return Object.freeze({
    enabledMethods: Object.freeze({
      PIX: booleanFlag(env, "ASAAS_PIX_ENABLED"),
      CREDIT_CARD: booleanFlag(env, "ASAAS_CREDIT_CARD_ENABLED"),
      BOLETO: booleanFlag(env, "ASAAS_BOLETO_ENABLED"),
    }),
    maxInstallments: integerInRange(env, "ASAAS_MAX_INSTALLMENTS", 1, 3),
    pixDueDays: integerInRange(env, "PAYMENT_PIX_DUE_DAYS", 1, 30),
    boletoDueDays: integerInRange(env, "PAYMENT_BOLETO_DUE_DAYS", 1, 30),
    checkoutMinutesToExpire: integerInRange(
      env,
      "PAYMENT_CHECKOUT_EXPIRATION_MINUTES",
      10,
      1440
    ),
    checkoutReturnUrl: parsed.toString().replace(/\/$/, ""),
  });
}

export function loadAsaasWebhookToken(
  env: PaymentEnvironmentVariables = process.env
): string {
  const token = required(env, "ASAAS_WEBHOOK_TOKEN");
  if (token.length < 32 || token.length > 255) {
    throw new PaymentConfigurationError(
      "ASAAS_WEBHOOK_TOKEN deve conter entre 32 e 255 caracteres."
    );
  }
  return token;
}
