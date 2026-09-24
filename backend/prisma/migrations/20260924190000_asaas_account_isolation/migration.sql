-- Identifica explicitamente a conta financeira que originou cada vÃ­nculo.
-- Valores existentes permanecem NULL por seguranÃ§a: sÃ£o tratados como legados
-- nÃ£o confiÃ¡veis e nunca reutilizados automaticamente em uma conta nova.
ALTER TABLE "customers" ADD COLUMN "asaasAccountId" TEXT;
ALTER TABLE "payments" ADD COLUMN "providerAccountId" TEXT;

CREATE INDEX "customers_asaasAccountId_idx" ON "customers"("asaasAccountId");
CREATE INDEX "payments_provider_providerAccountId_idx"
  ON "payments"("provider", "providerAccountId");
