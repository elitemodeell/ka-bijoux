import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyPrefix: string;
  failClosed?: boolean;
}

type RateLimitCount = { count: number };

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function databaseIncr(
  key: string,
  expiresAt: Date
): Promise<number> {
  const rows = await prisma.$queryRaw<RateLimitCount[]>`
    WITH expired AS (
      DELETE FROM "rate_limit_buckets"
      WHERE "expiresAt" < NOW() - INTERVAL '24 hours'
    )
    INSERT INTO "rate_limit_buckets"
      ("id", "count", "expiresAt", "createdAt", "updatedAt")
    VALUES
      (${key}, 1, ${expiresAt}, NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE
    SET
      "count" = "rate_limit_buckets"."count" + 1,
      "updatedAt" = NOW()
    RETURNING "count"
  `;

  const count = rows[0]?.count;
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Resposta inválida do rate limit.");
  }
  return count;
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): Promise<NextResponse | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const windowSec = Math.floor(config.windowMs / 1000);
  const windowKey = Math.floor(Date.now() / config.windowMs);
  const privateIdentifier = hashIdentifier(identifier || ip);
  const key = `rl:${config.keyPrefix}:${privateIdentifier}:${windowKey}`;
  const expiresAt = new Date((windowKey + 1) * config.windowMs);

  try {
    const count = await databaseIncr(key, expiresAt);
    if (count > config.limit) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde e tente novamente." },
        {
          status: 429,
          headers: {
            "Retry-After": String(windowSec),
            "X-RateLimit-Limit": String(config.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  } catch {
    if (config.failClosed && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "Serviço temporariamente indisponível. Tente novamente mais tarde.",
        },
        { status: 503, headers: { "Retry-After": "300" } }
      );
    }
  }

  return null;
}

export const RATE_LIMITS = {
  auth: {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    keyPrefix: "auth",
    failClosed: true,
  },
  payment: {
    limit: 5,
    windowMs: 60 * 1000,
    keyPrefix: "payment",
    failClosed: true,
  },
  forgotPassword: {
    limit: 3,
    windowMs: 15 * 60 * 1000,
    keyPrefix: "forgot",
    failClosed: true,
  },
  passwordResetIp: {
    limit: 10,
    windowMs: 15 * 60 * 1000,
    keyPrefix: "password-reset-ip",
    failClosed: true,
  },
  passwordResetAccount: {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyPrefix: "password-reset-account",
    failClosed: true,
  },
  accountDeletionIp: {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    keyPrefix: "account-delete-ip",
    failClosed: true,
  },
  accountDeletionEmail: {
    limit: 3,
    windowMs: 60 * 60 * 1000,
    keyPrefix: "account-delete-email",
    failClosed: true,
  },
} as const;
