-- Fluxo externo seguro de exclusÃ£o de conta.
-- Tokens sÃ£o persistidos apenas como SHA-256 e a auditoria usa referÃªncias
-- pseudonimizadas, sem armazenar o e-mail ou IP em texto puro.

CREATE TYPE "AccountDeletionRequestStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
  'EMAIL_FAILED'
);

CREATE TABLE "account_deletion_requests" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "AccountDeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "emailSentAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "customerId" TEXT NOT NULL,

  CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account_deletion_audits" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "customerRef" TEXT,
  "requestRef" TEXT,
  "emailHash" TEXT,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "account_deletion_audits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_deletion_requests_tokenHash_key"
  ON "account_deletion_requests"("tokenHash");
CREATE INDEX "account_deletion_requests_customerId_status_idx"
  ON "account_deletion_requests"("customerId", "status");
CREATE INDEX "account_deletion_requests_expiresAt_status_idx"
  ON "account_deletion_requests"("expiresAt", "status");
CREATE INDEX "account_deletion_audits_customerRef_createdAt_idx"
  ON "account_deletion_audits"("customerRef", "createdAt");
CREATE INDEX "account_deletion_audits_requestRef_createdAt_idx"
  ON "account_deletion_audits"("requestRef", "createdAt");
CREATE INDEX "account_deletion_audits_emailHash_createdAt_idx"
  ON "account_deletion_audits"("emailHash", "createdAt");
CREATE INDEX "account_deletion_audits_ipHash_createdAt_idx"
  ON "account_deletion_audits"("ipHash", "createdAt");

ALTER TABLE "account_deletion_requests"
  ADD CONSTRAINT "account_deletion_requests_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
