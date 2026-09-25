-- Campos opcionais preservam todos os endereços e pedidos existentes.
ALTER TABLE "addresses"
  ADD COLUMN IF NOT EXISTS "recipientName" TEXT,
  ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT;

-- Snapshot aditivo: pedidos antigos continuam válidos e pedidos novos preservam
-- o endereço realmente utilizado mesmo após uma edição no cadastro do cliente.
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "shippingStreet" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingComplement" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingNeighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingCity" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingState" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingZipCode" TEXT,
  ADD COLUMN IF NOT EXISTS "recipientName" TEXT,
  ADD COLUMN IF NOT EXISTS "recipientPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingOptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingServiceName" TEXT,
  ADD COLUMN IF NOT EXISTS "shippingEstimatedDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "shippingQuotedAt" TIMESTAMP(3);

-- A embalagem precisa ser informada pela loja; não há dimensões fictícias em produção.
ALTER TABLE "store_settings"
  ADD COLUMN IF NOT EXISTS "shippingPackageWeight" DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS "shippingPackageHeight" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "shippingPackageWidth" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "shippingPackageLength" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "shippingHandlingDays" INTEGER NOT NULL DEFAULT 1;
