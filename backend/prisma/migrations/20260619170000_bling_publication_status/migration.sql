DO $$ BEGIN
  CREATE TYPE "ProductPublicationStatus" AS ENUM (
    'IMPORTED',
    'PENDING_REVIEW',
    'APPROVED',
    'PUBLISHED',
    'HIDDEN',
    'MISSING_IMAGE',
    'MISSING_DESCRIPTION'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "publicationStatus" "ProductPublicationStatus" NOT NULL DEFAULT 'IMPORTED',
  ADD COLUMN IF NOT EXISTS "searchTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
