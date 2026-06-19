CREATE TYPE "ProductImportSource" AS ENUM ('MANUAL', 'BLING');
CREATE TYPE "ProductEnrichmentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING_RESEARCH', 'ENRICHED', 'NEEDS_MANUAL_REVIEW', 'MANUAL_REVIEWED');

ALTER TABLE "products"
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "ean" TEXT,
  ADD COLUMN "benefits" TEXT,
  ADD COLUMN "howToUse" TEXT,
  ADD COLUMN "composition" TEXT,
  ADD COLUMN "careInstructions" TEXT,
  ADD COLUMN "packageContents" TEXT,
  ADD COLUMN "blingId" TEXT,
  ADD COLUMN "importSource" "ProductImportSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "enrichmentStatus" "ProductEnrichmentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "researchSources" JSONB,
  ADD COLUMN "researchNotes" TEXT,
  ADD COLUMN "researchedAt" TIMESTAMP(3),
  ADD COLUMN "importedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "products_blingId_key" ON "products"("blingId");
