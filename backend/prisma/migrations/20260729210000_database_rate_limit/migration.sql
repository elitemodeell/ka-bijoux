CREATE TABLE "rate_limit_buckets" (
    "id" VARCHAR(191) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rate_limit_buckets_expiresAt_idx"
ON "rate_limit_buckets"("expiresAt");
