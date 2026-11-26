CREATE TYPE "StoryCategory" AS ENUM ('OFFICIAL', 'CUSTOMER', 'REVIEW', 'HIGHLIGHT');

ALTER TABLE "story_groups"
  ADD COLUMN "category" "StoryCategory" NOT NULL DEFAULT 'OFFICIAL',
  ADD COLUMN "reviewId" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "customerConsentConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "customerConsentConfirmedBy" TEXT,
  ADD CONSTRAINT "story_groups_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "reviews"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- The old Clientes shortcut is now the moderated customer Stories section.
-- It remains hidden publicly until explicit consent is recorded.
UPDATE "story_groups"
SET "category" = 'CUSTOMER'
WHERE "id" = 'story-clientes';

CREATE INDEX "story_groups_category_isActive_expiresAt_idx"
  ON "story_groups" ("category", "isActive", "expiresAt");
CREATE UNIQUE INDEX "story_groups_reviewId_key" ON "story_groups"("reviewId");

CREATE TABLE "store_likes" (
  "id" TEXT NOT NULL,
  "customerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_likes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_likes_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "store_likes_customerId_key" ON "store_likes"("customerId");

-- Likes are accessed only through authenticated backend routes using Prisma.
-- Keep PostgREST roles from reading or mutating this private table directly.
ALTER TABLE "store_likes" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "store_likes" FROM anon, authenticated;
