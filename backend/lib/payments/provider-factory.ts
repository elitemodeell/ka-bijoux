import {
  loadAsaasFeatureConfig,
  loadPaymentConfig,
  loadPaymentRoutingConfig,
  type PaymentEnvironmentVariables,
} from "./config";
import { AsaasPaymentProvider } from "./asaas-provider";
import {
  PaymentConfigurationError,
  type PaymentFetch,
  type PaymentProvider,
  type PaymentProviderId,
  type ProviderPaymentMethod,
} from "./types";

export interface PaymentProviderFactoryOptions {
  env?: PaymentEnvironmentVariables;
  fetch?: PaymentFetch;
  now?: () => Date;
  providers?: Partial<Record<PaymentProviderId, PaymentProvider>>;
}
export class PaymentProviderFactory {
  private readonly env: PaymentEnvironmentVariables;
  private readonly providers: Partial<Record<PaymentProviderId, PaymentProvider>>;

  constructor(options: PaymentProviderFactoryOptions = {}) {
    this.env = options.env ?? process.env;
    const configured = options.providers ?? {};
    this.providers = { ...configured };
    if (!this.providers.ASAAS) {
      this.providers.ASAAS = new AsaasPaymentProvider({
        config: loadPaymentConfig(this.env),
        fetch: options.fetch,
        now: options.now,
      });
    }
  }

  resolveForMethod(method: ProviderPaymentMethod): PaymentProvider {
    const routing = loadPaymentRoutingConfig(this.env);
    const features = loadAsaasFeatureConfig(this.env);
    if (!features.enabledMethods[method]) {
      throw new PaymentConfigurationError(
        `Método de pagamento ${method} está desabilitado.`
      );
    }
    return this.resolveById(routing.providersByMethod[method]);
  }

  resolveById(providerId: PaymentProviderId): PaymentProvider {
    const provider = this.providers[providerId];
    if (!provider) {
      throw new PaymentConfigurationError(
        `${providerId} não possui implementação ativa.`
      );
    }
    return provider;
  }

  listEnabledMethods() {
    const routing = loadPaymentRoutingConfig(this.env);
    const features = loadAsaasFeatureConfig(this.env);
    return (["PIX", "CREDIT_CARD", "BOLETO"] as const)
      .filter((method) => features.enabledMethods[method])
      .map((method) => ({
        method,
        provider: routing.providersByMethod[method],
        maxInstallments: method === "CREDIT_CARD" ? features.maxInstallments : 1,
      }));
  }
}
