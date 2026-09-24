CREATE TABLE "apple_auth_credentials" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "authUserId" UUID NOT NULL,
  "appleSubject" TEXT NOT NULL,
  "refreshTokenCiphertext" TEXT NOT NULL,
  "refreshTokenIv" TEXT NOT NULL,
  "refreshTokenAuthTag" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "apple_auth_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "apple_auth_credentials_customerId_key" ON "apple_auth_credentials"("customerId");
CREATE UNIQUE INDEX "apple_auth_credentials_authUserId_key" ON "apple_auth_credentials"("authUserId");
CREATE UNIQUE INDEX "apple_auth_credentials_appleSubject_key" ON "apple_auth_credentials"("appleSubject");

ALTER TABLE "apple_auth_credentials"
  ADD CONSTRAINT "apple_auth_credentials_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
