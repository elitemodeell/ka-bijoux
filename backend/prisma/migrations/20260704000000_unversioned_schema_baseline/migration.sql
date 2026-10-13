-- AlterTable
ALTER TABLE "product_variations" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sku" TEXT;
