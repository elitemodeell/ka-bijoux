ALTER TABLE "cart_items" ADD COLUMN "selectedPhotoUrl" TEXT;
ALTER INDEX "cart_items_cartId_productId_variationId_key" RENAME TO "cart_items_legacy_identity_key";
CREATE INDEX "cart_items_cartId_productId_variationId_idx" ON "cart_items" ("cartId", "productId", "variationId");
DROP INDEX "cart_items_legacy_identity_key";
