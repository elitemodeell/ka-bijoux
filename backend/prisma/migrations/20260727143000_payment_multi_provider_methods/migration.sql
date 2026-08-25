-- EvoluÃ§Ã£o compatÃ­vel do registro financeiro para mÃºltiplos mÃ©todos/provedores.
-- NÃ£o aplica nem altera credenciais. Executar em produÃ§Ã£o somente apÃ³s backup,
-- revisÃ£o dos registros legados e smoke test em ambiente isolado.

CREATE TYPE "PaymentEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

ALTER TABLE "payments"
  ADD COLUMN "externalCheckoutId" TEXT,
  ADD COLUMN "externalReference" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "environment" "PaymentEnvironment",
  ADD COLUMN "installmentCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "installmentValue" DECIMAL(10,2),
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "checkoutExpiration" TIMESTAMP(3),
  ADD COLUMN "boletoUrl" TEXT,
  ADD COLUMN "boletoDigitableLine" TEXT,
  ADD COLUMN "boletoExpiration" TIMESTAMP(3),
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "receivedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- A migraÃ§Ã£o financeira anterior precisou usar MERCADO_PAGO como valor tÃ©cnico
-- temporÃ¡rio para adicionar uma coluna NOT NULL. Tornamos a coluna anulÃ¡vel antes
-- do backfill: uma cobranÃ§a legada sem nenhum identificador externo nÃ£o possui
-- evidÃªncia suficiente para receber um provedor.
ALTER TABLE "payments" ALTER COLUMN "provider" DROP NOT NULL;

-- Apenas registros que jÃ¡ possuem vÃ­nculo inequÃ­voco com cliente Asaas sÃ£o
-- classificados automaticamente. Os demais permanecem com o provedor atual.
UPDATE "payments" p
SET
  "provider" = 'ASAAS',
  "externalReference" = p."orderId",
  "idempotencyKey" = p."orderId" || ':' || p."method"::text
FROM "customers" c, "orders" o
WHERE p."orderId" = o."id"
  AND o."customerId" = c."id"
  AND c."asaasCustomerId" IS NOT NULL
  AND p."externalCustomerId" = c."asaasCustomerId";

UPDATE "payments"
SET "provider" = NULL
WHERE "provider" = 'MERCADO_PAGO'
  AND "externalPaymentId" IS NULL
  AND "gatewayId" IS NULL;

CREATE UNIQUE INDEX "payments_provider_externalCheckoutId_key"
  ON "payments"("provider", "externalCheckoutId");
CREATE UNIQUE INDEX "payments_provider_idempotencyKey_key"
  ON "payments"("provider", "idempotencyKey");
