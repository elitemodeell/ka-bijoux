ALTER TABLE "store_settings"
ADD COLUMN IF NOT EXISTS "homePresentation" JSONB NOT NULL DEFAULT '{}'::jsonb;
