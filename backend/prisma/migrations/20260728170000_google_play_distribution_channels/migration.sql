-- ETAPA 5B: classificação persistente e fail-closed por canal de distribuição.
-- Esta migration deve ser ensaiada e aplicada manualmente; não executar
-- automaticamente em produção.

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

-- Bloqueio explícito da linha adulta e suas subdivisões.
UPDATE "categories"
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_BLOCKED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'Categoria comercial restrita; não distribuída pela Google Play.',
  "contentClassification" = 'ADULT_PRODUCT',
  "policyReviewStatus" = 'BLOCKED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_POLICY_AUDIT',
  "policyReviewNotes" = 'Conteúdo excluído da variante Google Play.'
WHERE "slug" = 'sex-shop' OR "slug" LIKE 'sex-shop-%';

UPDATE "products"
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_REVIEW_REQUIRED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'Produto da linha restrita requer decisão individual.',
  "contentClassification" = 'REVIEW_REQUIRED',
  "policyReviewStatus" = 'REVIEW_REQUIRED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_POLICY_AUDIT',
  "policyReviewNotes" = 'Produto aguardando decisão individual para a variante Google Play.'
WHERE "categoryId" IN (
  SELECT "id" FROM "categories"
  WHERE "slug" = 'sex-shop' OR "slug" LIKE 'sex-shop-%'
);

-- Somente produtos funcional/comercialmente explícitos são bloqueados por
-- regra. Os demais registros da linha restrita permanecem em revisão.
UPDATE "products" p
SET
  "playStoreStatus" = 'PLAY_BLOCKED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'Função, texto ou contexto comercial incompatível com a Google Play.',
  "contentClassification" = 'ADULT_PRODUCT',
  "policyReviewStatus" = 'BLOCKED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "policyReviewNotes" = 'Produto bloqueado após classificação funcional e comercial.'
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
       ~* '(vibrador|sugador|estimulador|masturbador|plug[[:space:]-]|acessorio anal|pr[oó]tese|fetiche|bdsm|brinquedo sexual|estimula[cç][aã]o sexual|prazer sexual|desempenho sexual)'
  );

-- Categorias gerais foram inventariadas separadamente. Isto é um backfill
-- explícito, não o padrão de novos registros.
UPDATE "categories"
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'GOOGLE_PLAY', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_ALLOWED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'Categoria geral aprovada; produtos continuam sujeitos a decisão individual.',
  "contentClassification" = CASE
    WHEN "slug" = 'lingerie' THEN 'LINGERIE_NEUTRAL'::"ContentClassification"
    ELSE 'GENERAL'::"ContentClassification"
  END,
  "policyReviewStatus" = 'APPROVED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_POLICY_AUDIT',
  "policyReviewNotes" = 'Categoria geral revisada no inventário da Etapa 5B.'
WHERE "slug" <> 'sex-shop' AND "slug" NOT LIKE 'sex-shop-%';

-- Produtos gerais fora de lingerie: aprovação explícita do inventário inicial.
UPDATE "products" p
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'GOOGLE_PLAY', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_ALLOWED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_REVISED_AUDIT',
  "playStoreReviewNotes" = 'Produto geral aprovado após inventário de tipo, texto e mídia cadastrada.',
  "contentClassification" = 'GENERAL',
  "policyReviewStatus" = 'APPROVED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_POLICY_AUDIT',
  "policyReviewNotes" = 'Produto de categoria geral aprovado no inventário inicial.'
FROM "categories" c
WHERE p."categoryId" = c."id"
  AND c."slug" <> 'sex-shop'
  AND c."slug" NOT LIKE 'sex-shop-%'
  AND c."slug" <> 'lingerie';

-- Lingerie não recebe aprovação em massa. Dois itens de apresentação neutra
-- foram revisados individualmente; o cadastro com imagem incompatível permanece
-- em revisão e fora da Play.
UPDATE "products"
SET
  "distributionChannels" = ARRAY['WEB_FULL', 'GOOGLE_PLAY', 'ADMIN']::"DistributionChannel"[],
  "playStoreStatus" = 'PLAY_ALLOWED',
  "playStoreReviewedAt" = CURRENT_TIMESTAMP,
  "playStoreReviewedBy" = 'ETAPA5B_VISUAL_REVIEW',
  "playStoreReviewNotes" = 'Apresentação comercial neutra revisada individualmente.',
  "contentClassification" = 'LINGERIE_NEUTRAL',
  "policyReviewStatus" = 'APPROVED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_VISUAL_REVIEW',
  "policyReviewNotes" = 'Imagem e descrição neutras, revisadas individualmente.'
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
  "playStoreReviewNotes" = 'Imagem incompatível com o cadastro; revisão humana necessária.',
  "contentClassification" = 'REVIEW_REQUIRED',
  "policyReviewStatus" = 'REVIEW_REQUIRED',
  "policyReviewedAt" = CURRENT_TIMESTAMP,
  "policyReviewedBy" = 'ETAPA5B_VISUAL_REVIEW',
  "policyReviewNotes" = 'Imagem incompatível com o cadastro; revisão humana necessária.'
WHERE "id" = 'cmr6c4fnf001ifu1pxv82tyer';

CREATE INDEX "categories_play_policy_idx"
  ON "categories" ("active", "playStoreStatus");
CREATE INDEX "products_play_policy_idx"
  ON "products" ("active", "playStoreStatus");
CREATE INDEX "story_groups_play_policy_idx"
  ON "story_groups" ("isActive", "playStoreStatus");
CREATE INDEX "story_items_play_policy_idx"
  ON "story_items" ("isActive", "playStoreStatus");
