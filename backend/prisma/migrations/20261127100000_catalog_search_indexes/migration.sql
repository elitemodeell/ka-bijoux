-- Additive search indexes for the KA Bijoux public catalog.
-- Names follow the production Prisma @@map table names.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "products_name_trgm_idx"
  ON "products" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_slug_trgm_idx"
  ON "products" USING GIN ("slug" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_description_trgm_idx"
  ON "products" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_brand_trgm_idx"
  ON "products" USING GIN ("brand" gin_trgm_ops)
  WHERE "brand" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "products_sku_trgm_idx"
  ON "products" USING GIN ("sku" gin_trgm_ops)
  WHERE "sku" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "products_ean_trgm_idx"
  ON "products" USING GIN ("ean" gin_trgm_ops)
  WHERE "ean" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "products_searchTags_gin_idx"
  ON "products" USING GIN ("searchTags");
CREATE INDEX IF NOT EXISTS "categories_name_trgm_idx"
  ON "categories" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "categories_slug_trgm_idx"
  ON "categories" USING GIN ("slug" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "product_variations_name_trgm_idx"
  ON "product_variations" USING GIN ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "product_variations_value_trgm_idx"
  ON "product_variations" USING GIN ("value" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "product_variations_sku_trgm_idx"
  ON "product_variations" USING GIN ("sku" gin_trgm_ops)
  WHERE "sku" IS NOT NULL;
