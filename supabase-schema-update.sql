-- ─────────────────────────────────────────────────────────────────────────────
-- KA Bijoux — Atualização de schema (julho 2026)
--
-- COMO USAR:
--   1. Abra o Supabase Dashboard → projeto ka-bijoux
--   2. Acesse: SQL Editor → New query
--   3. Cole este arquivo inteiro e clique em Run
--
-- OU rode no terminal:
--   cd backend && npx prisma db push
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Campos de recuperação de senha no Customer
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "passwordResetCode"    TEXT,
  ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMPTZ;

-- 2. Tabela de logs de consentimento LGPD
CREATE TABLE IF NOT EXISTS "consent_logs" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "customerId" TEXT        NOT NULL,
  "version"    TEXT        NOT NULL,
  "ip"         TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "consent_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consent_logs_customerId_idx" ON "consent_logs" ("customerId");

-- 3. Índices novos em products
CREATE INDEX IF NOT EXISTS "products_categoryId_idx"              ON "products" ("categoryId");
CREATE INDEX IF NOT EXISTS "products_active_publicationStatus_idx" ON "products" ("active", "publicationStatus");
CREATE INDEX IF NOT EXISTS "products_featured_active_idx"         ON "products" ("featured", "active");
CREATE INDEX IF NOT EXISTS "products_createdAt_idx"               ON "products" ("createdAt");

-- 4. Índices novos em orders
CREATE INDEX IF NOT EXISTS "orders_customerId_idx"        ON "orders" ("customerId");
CREATE INDEX IF NOT EXISTS "orders_status_idx"            ON "orders" ("status");
CREATE INDEX IF NOT EXISTS "orders_customerId_status_idx" ON "orders" ("customerId", "status");
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx"         ON "orders" ("createdAt");

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificação
-- ─────────────────────────────────────────────────────────────────────────────
SELECT column_name FROM information_schema.columns
WHERE table_name = 'customers'
  AND column_name IN ('passwordResetCode', 'passwordResetExpires');

SELECT tablename FROM pg_tables WHERE tablename = 'consent_logs';
