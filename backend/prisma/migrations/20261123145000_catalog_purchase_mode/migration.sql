ALTER TABLE "products" ADD COLUMN "purchaseMode" TEXT;

ALTER TABLE "products" ADD CONSTRAINT "products_purchase_mode_check"
  CHECK ("purchaseMode" IN ('SINGLE', 'OPTIONS', 'REVIEW'));
