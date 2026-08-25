-- ETAPA 5B: classificaÃ§Ã£o persistente e fail-closed por canal de distribuiÃ§Ã£o.
-- Esta migration deve ser ensaiada e aplicada manualmente; nÃ£o executar
-- automaticamente em produÃ§Ã£o.

CREATE TYPE "DistributionChannel" AS ENUM ('WEB_FULL', 'GOOGLE_PLAY', 'ADMIN');
CREATE TYPE "PlayStoreStatus" AS ENUM (
  'PLAY_ALLOWED',
  'PLAY_BLOCKED',
  'PLAY_REVIEW_REQUIRED'
);
CREATE TYPE "ContentClassification" AS ENUM (
  'GENERAL',
  'LINGERIE_NEUTRAL',
  'ADULT_PRODUCT',
  'SEXUALLY_EXPLICIT',
  'REVIEW_REQUIRED',
  'UNCLASSIFIED'
);
CREATE TYPE "PolicyReviewStatus" AS ENUM (
  'UNCLASSIFIED',
  'REVIEW_REQUIRED',
  'APPROVED',
  'BLOCKED'
);

ALTER TABLE "categories"
  ADD COLUMN "distributionChannels" "DistributionChannel"[] NOT NULL
    DEFAULT ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  ADD COLUMN "playStoreStatus" "PlayStoreStatus" NOT NULL DEFAULT 'PLAY_REVIEW_REQUIRED',
  ADD COLUMN "playStoreReviewedAt" TIMESTAMP(3),
  ADD COLUMN "playStoreReviewedBy" TEXT,
  ADD COLUMN "playStoreReviewNotes" TEXT,
  ADD COLUMN "contentClassification" "ContentClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewStatus" "PolicyReviewStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "policyReviewedBy" TEXT,
  ADD COLUMN "policyReviewNotes" TEXT;

ALTER TABLE "products"
  ADD COLUMN "distributionChannels" "DistributionChannel"[] NOT NULL
    DEFAULT ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  ADD COLUMN "playStoreStatus" "PlayStoreStatus" NOT NULL DEFAULT 'PLAY_REVIEW_REQUIRED',
  ADD COLUMN "playStoreReviewedAt" TIMESTAMP(3),
  ADD COLUMN "playStoreReviewedBy" TEXT,
  ADD COLUMN "playStoreReviewNotes" TEXT,
  ADD COLUMN "contentClassification" "ContentClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewStatus" "PolicyReviewStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "policyReviewedBy" TEXT,
  ADD COLUMN "policyReviewNotes" TEXT;

ALTER TABLE "coupons"
  ADD COLUMN "distributionChannels" "DistributionChannel"[] NOT NULL
    DEFAULT ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  ADD COLUMN "playStoreStatus" "PlayStoreStatus" NOT NULL DEFAULT 'PLAY_REVIEW_REQUIRED',
  ADD COLUMN "playStoreReviewedAt" TIMESTAMP(3),
  ADD COLUMN "playStoreReviewedBy" TEXT,
  ADD COLUMN "playStoreReviewNotes" TEXT,
  ADD COLUMN "contentClassification" "ContentClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewStatus" "PolicyReviewStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "policyReviewedBy" TEXT,
  ADD COLUMN "policyReviewNotes" TEXT;

ALTER TABLE "notifications"
  ADD COLUMN "distributionChannels" "DistributionChannel"[] NOT NULL
    DEFAULT ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  ADD COLUMN "playStoreStatus" "PlayStoreStatus" NOT NULL DEFAULT 'PLAY_REVIEW_REQUIRED',
  ADD COLUMN "playStoreReviewedAt" TIMESTAMP(3),
  ADD COLUMN "playStoreReviewedBy" TEXT,
  ADD COLUMN "playStoreReviewNotes" TEXT,
  ADD COLUMN "contentClassification" "ContentClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewStatus" "PolicyReviewStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "policyReviewedBy" TEXT,
  ADD COLUMN "policyReviewNotes" TEXT;

ALTER TABLE "reviews"
  ADD COLUMN "distributionChannels" "DistributionChannel"[] NOT NULL
    DEFAULT ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  ADD COLUMN "playStoreStatus" "PlayStoreStatus" NOT NULL DEFAULT 'PLAY_REVIEW_REQUIRED',
  ADD COLUMN "playStoreReviewedAt" TIMESTAMP(3),
  ADD COLUMN "playStoreReviewedBy" TEXT,
  ADD COLUMN "playStoreReviewNotes" TEXT,
  ADD COLUMN "contentClassification" "ContentClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewStatus" "PolicyReviewStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "policyReviewedBy" TEXT,
  ADD COLUMN "policyReviewNotes" TEXT;

ALTER TABLE "story_groups"
  ADD COLUMN "distributionChannels" "DistributionChannel"[] NOT NULL
    DEFAULT ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  ADD COLUMN "playStoreStatus" "PlayStoreStatus" NOT NULL DEFAULT 'PLAY_REVIEW_REQUIRED',
  ADD COLUMN "playStoreReviewedAt" TIMESTAMP(3),
  ADD COLUMN "playStoreReviewedBy" TEXT,
  ADD COLUMN "playStoreReviewNotes" TEXT,
  ADD COLUMN "contentClassification" "ContentClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewStatus" "PolicyReviewStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "policyReviewedBy" TEXT,
  ADD COLUMN "policyReviewNotes" TEXT;

ALTER TABLE "story_items"
  ADD COLUMN "distributionChannels" "DistributionChannel"[] NOT NULL
    DEFAULT ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  ADD COLUMN "playStoreStatus" "PlayStoreStatus" NOT NULL DEFAULT 'PLAY_REVIEW_REQUIRED',
  ADD COLUMN "playStoreReviewedAt" TIMESTAMP(3),
  ADD COLUMN "playStoreReviewedBy" TEXT,
  ADD COLUMN "playStoreReviewNotes" TEXT,
  ADD COLUMN "contentClassification" "ContentClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewStatus" "PolicyReviewStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
  ADD COLUMN "policyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "policyReviewedBy" TEXT,
  ADD COLUMN "policyReviewNotes" TEXT;

-- Bloqueio explÃ­cito da linha adulta e suas subdivisÃµes.
UPDATE "categories"
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_BLOCKED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'Categoria comercial restrita; nÃ£o distribuÃ­da pela Google Play.',
  "contentClassification" = 'ADULT_PRODUCT',
  "policyReviewStatus" = 'BLOCKED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_POLICY_AUDIT',
  "policyReviewNotes" = 'ConteÃºdo excluÃ­do da variante Google Play.'
WHERE "slug" = 'sex-shop' OR "slug" LIKE 'sex-shop-%';

UPDATE "products"
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_REVIEW_REQUIRED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'Produto da linha restrita requer decisÃ£o individual.',
  "contentClassification" = 'REVIEW_REQUIRED',
  "policyReviewStatus" = 'REVIEW_REQUIRED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_POLICY_AUDIT',
  "policyReviewNotes" = 'Produto aguardando decisÃ£o individual para a variante Google Play.'
WHERE "categoryId" IN (
  SELECT "id" FROM "categories"
  WHERE "slug" = 'sex-shop' OR "slug" LIKE 'sex-shop-%'
);

-- Somente produtos funcional/comercialmente explÃ­citos sÃ£o bloqueados por
-- regra. Os demais registros da linha restrita permanecem em revisÃ£o.
UPDATE "products" p
SET
  "playStoreStatus" = 'PLAY_BLOCKED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'FunÃ§Ã£o, texto ou contexto comercial incompatÃ­vel com a Google Play.',
  "contentClassification" = 'ADULT_PRODUCT',
  "policyReviewStatus" = 'BLOCKED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "policyReviewNotes" = 'Produto bloqueado apÃ³s classificaÃ§Ã£o funcional e comercial.'
FROM "categories" c
LEFT JOIN "categories" parent ON c."parentId" = parent."id"
WHERE p."categoryId" = c."id"
  AND (
    c."slug" ~* '(vibrador|sugador|estimulador|masturbador|plug|anal|protese|fetiche|bdsm|anel)'
    OR COALESCE(parent."slug", '') ~* '(vibrador|sugador|estimulador|masturbador|plug|anal|protese|fetiche|bdsm|anel)'
    OR EXISTS (
      SELECT 1
      FROM "categories" subcategory
      WHERE subcategory."id" = p."subcategoryId"
        AND subcategory."slug" ~* '(vibrador|sugador|estimulador|masturbador|plug|anal|protese|fetiche|bdsm|anel)'
    )
    OR (p."name" || ' ' || p."description" || ' ' || array_to_string(p."searchTags", ' '))
       ~* '(vibrador|sugador|estimulador|masturbador|plug[[:space:]-]|acessorio anal|pr[oÃ³]tese|fetiche|bdsm|brinquedo sexual|estimula[cÃ§][aÃ£]o sexual|prazer sexual|desempenho sexual)'
  );

-- Categorias gerais foram inventariadas separadamente. Isto Ã© um backfill
-- explÃ­cito, nÃ£o o padrÃ£o de novos registros.
UPDATE "categories"
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'GOOGLE_PLAY', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_ALLOWED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'Categoria geral aprovada; produtos continuam sujeitos a decisÃ£o individual.',
  "contentClassification" = CASE
    WHEN "slug" = 'lingerie' THEN 'LINGERIE_NEUTRAL'::"ContentClassification"
    ELSE 'GENERAL'::"ContentClassification"
  END,
  "policyReviewStatus" = 'APPROVED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_POLICY_AUDIT',
  "policyReviewNotes" = 'Categoria geral revisada no inventÃ¡rio da Etapa 5B.'
WHERE "slug" <> 'sex-shop' AND "slug" NOT LIKE 'sex-shop-%';

-- Produtos gerais fora de lingerie: aprovaÃ§Ã£o explÃ­cita do inventÃ¡rio inicial.
UPDATE "products" p
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'GOOGLE_PLAY', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_ALLOWED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'Produto geral aprovado apÃ³s inventÃ¡rio de tipo, texto e mÃ­dia cadastrada.',
  "contentClassification" = 'GENERAL',
  "policyReviewStatus" = 'APPROVED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_POLICY_AUDIT',
  "policyReviewNotes" = 'Produto de categoria geral aprovado no inventÃ¡rio inicial.'
FROM "categories" c
WHERE p."categoryId" = c."id"
  AND c."slug" <> 'sex-shop'
  AND c."slug" NOT LIKE 'sex-shop-%'
  AND c."slug" <> 'lingerie';

-- Lingerie nÃ£o recebe aprovaÃ§Ã£o em massa. Dois itens de apresentaÃ§Ã£o neutra
-- foram revisados individualmente; o cadastro com imagem incompatÃ­vel permanece
-- em revisÃ£o e fora da Play.
UPDATE "products"
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'GOOGLE_PLAY', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_ALLOWED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_VISUAL_REVIEW',
  "playStoreReviewNotes" = 'ApresentaÃ§Ã£o comercial neutra revisada individualmente.',
  "contentClassification" = 'LINGERIE_NEUTRAL',
  "policyReviewStatus" = 'APPROVED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_VISUAL_REVIEW',
  "policyReviewNotes" = 'Imagem e descriÃ§Ã£o neutras, revisadas individualmente.'
WHERE "id" IN (
  'cmr6i1s0c0031rhf8nqzyc2ef',
  'cmr6i1s470034rhf850dp3t4e'
);

UPDATE "products"
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_REVIEW_REQUIRED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_VISUAL_REVIEW',
  "playStoreReviewNotes" = 'Imagem incompatÃ­vel com o cadastro; revisÃ£o humana necessÃ¡ria.',
  "contentClassification" = 'REVIEW_REQUIRED',
  "policyReviewStatus" = 'REVIEW_REQUIRED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_VISUAL_REVIEW',
  "policyReviewNotes" = 'Imagem incompatÃ­vel com o cadastro; revisÃ£o humana necessÃ¡ria.'
WHERE "id" = 'cmr6c4fnf001ifu1pxv82tyer';

CREATE INDEX "categories_play_policy_idx"
  ON "categories" ("active", "playStoreStatus");
CREATE INDEX "products_play_policy_idx"
  ON "products" ("active", "playStoreStatus");
CREATE INDEX "story_groups_play_policy_idx"
  ON "story_groups" ("isActive", "playStoreStatus");
CREATE INDEX "story_items_play_policy_idx"
  ON "story_items" ("isActive", "playStoreStatus");
