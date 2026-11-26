-- Editorial ranking is intentionally separate from Bling-managed commercial fields.
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "homeSortOrder" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_homeSortOrder_range_check'
  ) THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_homeSortOrder_range_check"
      CHECK ("homeSortOrder" IS NULL OR ("homeSortOrder" >= 1 AND "homeSortOrder" <= 30));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "products_homeSortOrder_active_idx"
  ON "products" ("homeSortOrder", "active");

-- Initial 24 picks were visually reviewed from the public mobile API and use
-- only currently saleable products with official KA Bijoux photos.
UPDATE "products" AS p
SET "homeSortOrder" = picks.sort_position
FROM (VALUES
  ('cmr7z1k430013z6w58147qevx', 1),
  ('cmrwb2djy001u55o9s8pxvtg0', 2),
  ('cmr6i20ev009jrhf8h3n1h6p0', 3),
  ('cmr6i1xwn007prhf8upbot4bt', 4),
  ('cmr9al49900092np39qiqz3q9', 5),
  ('cmr7z1fhh0003z6w5k1vsug4o', 6),
  ('cmr7z1ltr001fz6w5lo7r3pr7', 7),
  ('cmrw6y59q001wxg38afd5jq7m', 8),
  ('cmr7z1m1q001hz6w56ofgylai', 9),
  ('cmr7z1h40000fz6w5jic0csie', 10),
  ('cmr6i20il009mrhf8wbvky4w2', 11),
  ('cmr6i1vwa0064rhf8kr5dhwva', 12),
  ('cmr7z1llo001dz6w5802hwagv', 13),
  ('cmr6i1yfg0084rhf8whh16fld', 14),
  ('cmrw6yljx004bxg38r1xpp40k', 15),
  ('cmr6i1xkw007grhf8ah1b3dsl', 16),
  ('cmr6i1vop005yrhf8mwuef3ro', 17),
  ('cmr6i1smy003jrhf8uznhtnv4', 18),
  ('cmr6i1y47007vrhf80vlreeic', 19),
  ('cmr6i1way006grhf8znvq4akz', 20),
  ('cmr6i1q1r001jrhf8763xaw2b', 21),
  ('cmr6i20b4009grhf80me599hm', 22),
  ('cmr6i1raw002jrhf8pungde9r', 23),
  ('cmr6i1zfz008srhf8z47v6g4h', 24)
) AS picks(id, sort_position)
WHERE p."id" = picks.id
  AND NOT EXISTS (SELECT 1 FROM "products" WHERE "homeSortOrder" IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM "categories" AS c
    WHERE c."id" = p."categoryId"
      AND c."slug" <> 'sex-shop'
  );
