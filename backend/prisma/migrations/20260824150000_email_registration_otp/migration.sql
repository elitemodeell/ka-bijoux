CREATE TABLE "pending_email_registrations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentIp" TEXT,
    "consentUserAgent" TEXT,
    "otpDigest" TEXT NOT NULL,
    "otpExpiresAt" TIMESTAMP(3) NOT NULL,
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_email_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_otp_rate_limits" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "keyDigest" TEXT NOT NULL,
    "windowStarted" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_otp_rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_email_registrations_email_key" ON "pending_email_registrations"("email");
CREATE INDEX "pending_email_registrations_otpExpiresAt_idx" ON "pending_email_registrations"("otpExpiresAt");
CREATE UNIQUE INDEX "email_otp_rate_limits_scope_keyDigest_key" ON "email_otp_rate_limits"("scope", "keyDigest");
CREATE INDEX "email_otp_rate_limits_updatedAt_idx" ON "email_otp_rate_limits"("updatedAt");
