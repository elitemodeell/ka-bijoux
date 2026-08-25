-- Fase 2: camada financeira idempotente e preparada para Asaas.
-- Migracao estritamente aditiva: nao remove nem reescreve pedidos existentes.

CREATE TYPE "PaymentProvider" AS ENUM ('ASAAS', 'MERCADO_PAGO');
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAGAMENTO_PENDENTE';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAGAMENTO_EXPIRADO';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'FALHA_NO_PAGAMENTO';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REEMBOLSO_PENDENTE';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REEMBOLSADO';

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EM_ANALISE';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRADO';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'FALHA';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'ESTORNO_PENDENTE';

ALTER TABLE "customers"
  ADD COLUMN "asaasCustomerId" TEXT,
  ADD COLUMN "asaasCreationClaimedAt" TIMESTAMP(3),
  ADD COLUMN "asaasCreationAttemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders"
  ADD COLUMN "checkoutIdempotencyKey" TEXT,
  ADD COLUMN "checkoutRequestHash" TEXT;
ALTER TABLE "payments"
  ADD COLUMN "provider" "PaymentProvider" NOT NULL DEFAULT 'MERCADO_PAGO',
  ADD COLUMN "externalPaymentId" TEXT,
  ADD COLUMN "externalCustomerId" TEXT,
  ADD COLUMN "lastProviderStatus" TEXT,
  ADD COLUMN "pixQrCode" TEXT,
  ADD COLUMN "stockCommittedAt" TIMESTAMP(3),
  ADD COLUMN "creationClaimedAt" TIMESTAMP(3),
  ADD COLUMN "creationAttemptCount" INTEGER NOT NULL DEFAULT 0;

-- O default serve apenas para classificar linhas legadas durante o backfill.
ALTER TABLE "payments" ALTER COLUMN "provider" DROP DEFAULT;

CREATE UNIQUE INDEX "customers_asaasCustomerId_key" ON "customers"("asaasCustomerId");
CREATE UNIQUE INDEX "orders_checkoutIdempotencyKey_key" ON "orders"("checkoutIdempotencyKey");
CREATE UNIQUE INDEX "payments_provider_externalPaymentId_key" ON "payments"("provider", "externalPaymentId");

CREATE TABLE "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "externalPaymentId" TEXT,
  "payloadHash" TEXT,
  "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "errorSummary" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingStartedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "orderId" TEXT,
  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_webhook_events_provider_externalEventId_key"
  ON "payment_webhook_events"("provider", "externalEventId");
CREATE INDEX "payment_webhook_events_externalPaymentId_idx"
  ON "payment_webhook_events"("externalPaymentId");
CREATE INDEX "payment_webhook_events_orderId_idx"
  ON "payment_webhook_events"("orderId");
CREATE INDEX "payment_webhook_events_processingStatus_receivedAt_idx"
  ON "payment_webhook_events"("processingStatus", "receivedAt");

ALTER TABLE "payment_webhook_events"
  ADD CONSTRAINT "payment_webhook_events_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
