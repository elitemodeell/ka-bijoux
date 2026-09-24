import { describe, expect, it } from "vitest";
import { loadAsaasWebhookToken, loadPaymentConfig } from "@/lib/payments/config";
import {
  assertPaymentStatusTransition,
  mapAsaasEventStatus,
  mapAsaasPaymentStatus,
  resolvePaymentStatusTransition,
} from "@/lib/payments/state-machine";
import {
  PaymentConfigurationError,
  PaymentStateTransitionError,
} from "@/lib/payments/types";

function sandboxEnv(
  overrides: Record<string, string | undefined> = {}
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    PAYMENT_PROVIDER: "ASAAS",
    ASAAS_ENVIRONMENT: "sandbox",
    ASAAS_API_KEY: "synthetic-sandbox-key-for-offline-tests",
    ASAAS_EXPECTED_LEGAL_NAME: "KABIJOUX LTDA",
    ASAAS_EXPECTED_CPF_CNPJ: "31042012000102",
    ASAAS_EXPECTED_WALLET_ID: "wallet-ka-tests",
    ASAAS_WEBHOOK_TOKEN: "webhook-token-with-more-than-32-characters",
    ...overrides,
  };
}

describe("payment configuration fails closed", () => {
  it("[23] rejects a missing Asaas API key in production", () => {
    const env = sandboxEnv({ NODE_ENV: "production", ASAAS_ENVIRONMENT: "production" });
    delete env.ASAAS_API_KEY;

    expect(() => loadPaymentConfig(env)).toThrow(PaymentConfigurationError);
    expect(() => loadPaymentConfig(env)).toThrow(/ASAAS_API_KEY/);
  });

  it("[24] rejects a missing provider in production instead of selecting a fallback", () => {
    const env = sandboxEnv({ NODE_ENV: "production" });
    delete env.PAYMENT_PROVIDER;

    expect(() => loadPaymentConfig(env)).toThrow(PaymentConfigurationError);
    expect(() => loadPaymentConfig(env)).toThrow(/PAYMENT_PROVIDER/);
  });

  it("[25] keeps Mercado Pago explicitly disabled", () => {
    expect(() => loadPaymentConfig(sandboxEnv({ PAYMENT_PROVIDER: "MERCADO_PAGO" }))).toThrow(
      /MERCADO_PAGO não possui implementação ativa/
    );
  });

  it("[26] blocks mock credentials and mock providers in production", () => {
    expect(() => loadPaymentConfig({ NODE_ENV: "production" })).toThrow(PaymentConfigurationError);
    expect(() => loadAsaasWebhookToken({ NODE_ENV: "production" })).toThrow(PaymentConfigurationError);
  });

  it("loads only the explicit Sandbox endpoint for an offline synthetic test key", () => {
    expect(loadPaymentConfig(sandboxEnv())).toMatchObject({
      provider: "ASAAS",
      environment: "sandbox",
      baseUrl: "https://api-sandbox.asaas.com/v3",
      apiKey: "synthetic-sandbox-key-for-offline-tests",
    });
  });

  it("requires an explicit expected KA Bijoux account identity", () => {
    for (const name of [
      "ASAAS_EXPECTED_LEGAL_NAME",
      "ASAAS_EXPECTED_CPF_CNPJ",
      "ASAAS_EXPECTED_WALLET_ID",
    ]) {
      const env = sandboxEnv();
      delete env[name];
      expect(() => loadPaymentConfig(env)).toThrow(PaymentConfigurationError);
    }
  });

  it("rejects official-looking keys used in the wrong environment", () => {
    expect(() =>
      loadPaymentConfig(sandboxEnv({ ASAAS_API_KEY: "$aact_prod_not-a-real-key" }))
    ).toThrow(/produção não pode ser usada no Sandbox/);
    expect(() =>
      loadPaymentConfig(
        sandboxEnv({
          ASAAS_ENVIRONMENT: "production",
          ASAAS_API_KEY: "$aact_hmlg_not-a-real-key",
        })
      )
    ).toThrow(/Sandbox não pode ser usada em produção/);
  });
});

describe("payment state machine", () => {
  it("[16] rejects an out-of-order pending event after payment is already paid", () => {
    const resolution = resolvePaymentStatusTransition("PAID", "PENDING");

    expect(resolution).toMatchObject({
      allowed: false,
      changed: false,
      nextStatus: "PAID",
    });
    expect(() => assertPaymentStatusTransition("PAID", "PENDING")).toThrow(
      PaymentStateTransitionError
    );
  });

  it("[19] treats a second payment confirmation as an idempotent no-op", () => {
    expect(resolvePaymentStatusTransition("PAID", "PAID")).toEqual({
      allowed: true,
      changed: false,
      currentStatus: "PAID",
      attemptedStatus: "PAID",
      nextStatus: "PAID",
    });
  });

  it("[20] maps an overdue Pix to expired without reducing stock", () => {
    expect(mapAsaasEventStatus("PAYMENT_OVERDUE", "OVERDUE")).toBe("EXPIRED");
    expect(resolvePaymentStatusTransition("PENDING", "EXPIRED").allowed).toBe(true);
    expect(resolvePaymentStatusTransition("EXPIRED", "PAID").allowed).toBe(true);
  });

  it("maps refund-in-progress and completes a refund without reopening the purchase", () => {
    expect(mapAsaasEventStatus("PAYMENT_REFUND_IN_PROGRESS", "REFUND_REQUESTED")).toBe(
      "REFUND_PENDING"
    );
    expect(resolvePaymentStatusTransition("PAID", "REFUND_PENDING").allowed).toBe(true);
    expect(resolvePaymentStatusTransition("REFUND_PENDING", "REFUNDED").allowed).toBe(true);
    expect(resolvePaymentStatusTransition("REFUNDED", "PAID").allowed).toBe(false);
  });

  it("maps unknown provider statuses without applying an unsafe transition", () => {
    expect(mapAsaasPaymentStatus("SOMETHING_NEW")).toBe("UNKNOWN");
    expect(resolvePaymentStatusTransition("PENDING", "UNKNOWN")).toMatchObject({
      allowed: false,
      nextStatus: "PENDING",
    });
  });

  it("allows an Asaas-restored canceled Pix to be received but keeps terminal states safe", () => {
    expect(resolvePaymentStatusTransition("CANCELED", "PENDING").allowed).toBe(true);
    expect(resolvePaymentStatusTransition("CANCELED", "PAID").allowed).toBe(true);
    expect(resolvePaymentStatusTransition("FAILED", "PAID").allowed).toBe(false);
    expect(resolvePaymentStatusTransition("PAID", "PENDING").allowed).toBe(false);
    expect(resolvePaymentStatusTransition("REFUNDED", "PAID").allowed).toBe(false);
  });
});
describe("production credential hardening", () => {
  it.each(["synthetic-production-key", "placeholder", "change-me"])(
    "[26] rejects the mock or placeholder Asaas key %s in production",
    (apiKey) => {
      expect(() =>
        loadPaymentConfig({
          NODE_ENV: "production",
          PAYMENT_PROVIDER: "ASAAS",
          ASAAS_ENVIRONMENT: "production",
          ASAAS_API_KEY: apiKey,
          ASAAS_EXPECTED_LEGAL_NAME: "KABIJOUX LTDA",
          ASAAS_EXPECTED_CPF_CNPJ: "31042012000102",
          ASAAS_EXPECTED_WALLET_ID: "wallet-ka-tests",
        })
      ).toThrow(PaymentConfigurationError);
    }
  );

  it("[26] permits an unprefixed synthetic Asaas key only in test Sandbox", () => {
    expect(
      loadPaymentConfig(
        sandboxEnv({
          NODE_ENV: "test",
          ASAAS_ENVIRONMENT: "sandbox",
          ASAAS_API_KEY: "synthetic-offline-test-key",
        })
      ).environment
    ).toBe("sandbox");

    expect(() =>
      loadPaymentConfig(
        sandboxEnv({
          NODE_ENV: "development",
          ASAAS_ENVIRONMENT: "sandbox",
          ASAAS_API_KEY: "synthetic-offline-test-key",
        })
      )
    ).toThrow(PaymentConfigurationError);
  });

  it("rejects an Asaas webhook token shorter than 32 characters", () => {
    expect(() =>
      loadAsaasWebhookToken({
        NODE_ENV: "production",
        ASAAS_WEBHOOK_TOKEN: "x".repeat(31),
      })
    ).toThrow(PaymentConfigurationError);
  });

  it("rejects an Asaas webhook token longer than 255 characters", () => {
    expect(() =>
      loadAsaasWebhookToken({
        NODE_ENV: "production",
        ASAAS_WEBHOOK_TOKEN: "x".repeat(256),
      })
    ).toThrow(PaymentConfigurationError);
  });

  it("accepts Asaas webhook token lengths at the documented boundaries", () => {
    expect(
      loadAsaasWebhookToken({
        NODE_ENV: "production",
        ASAAS_WEBHOOK_TOKEN: "x".repeat(32),
      })
    ).toHaveLength(32);
    expect(
      loadAsaasWebhookToken({
        NODE_ENV: "production",
        ASAAS_WEBHOOK_TOKEN: "x".repeat(255),
      })
    ).toHaveLength(255);
  });
});
