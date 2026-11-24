ALTER TABLE "product_images" ADD COLUMN "approvedForPublication" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "product_variations" ADD COLUMN "approvedImageUrl" TEXT;
