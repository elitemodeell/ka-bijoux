CREATE INDEX IF NOT EXISTS "products_categoryId_active_createdAt_idx"
ON "products"("categoryId", "active", "createdAt");

CREATE INDEX IF NOT EXISTS "products_subcategoryId_active_createdAt_idx"
ON "products"("subcategoryId", "active", "createdAt");

CREATE INDEX IF NOT EXISTS "products_active_isNew_createdAt_idx"
ON "products"("active", "isNew", "createdAt");

CREATE INDEX IF NOT EXISTS "products_active_soldCount_idx"
ON "products"("active", "soldCount");

CREATE INDEX IF NOT EXISTS "products_active_promotionalPrice_idx"
ON "products"("active", "promotionalPrice");

CREATE INDEX IF NOT EXISTS "product_images_productId_order_idx"
ON "product_images"("productId", "order");

CREATE INDEX IF NOT EXISTS "product_variations_productId_active_order_idx"
ON "product_variations"("productId", "active", "order");
