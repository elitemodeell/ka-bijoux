ALTER TABLE "products" ADD COLUMN "blingVerifiedSku" TEXT;

ALTER TABLE "product_variations"
  ADD COLUMN "blingId" TEXT,
  ADD COLUMN "blingVerifiedSku" TEXT;

CREATE UNIQUE INDEX "product_variations_blingId_key" ON "product_variations"("blingId");
