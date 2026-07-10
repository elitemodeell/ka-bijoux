import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  keyPrefix: string;
}

async function upstashIncr(key: string, windowMs: number): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

  const pipeline = [
    ["INCR", key],
    ["PEXPIRE", key, String(windowMs)],
  ];

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(pipeline),
  });

  const data = (await res.json()) as Array<{ result: number }>;
  return data[0]?.result ?? 1;
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const hasUpstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!hasUpstash) return null; // skip gracefully in dev

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const windowSec = Math.floor(config.windowMs / 1000);
  const windowKey = Math.floor(Date.now() / config.windowMs);
  const key = `rl:${config.keyPrefix}:${ip}:${windowKey}`;

  try {
    const count = await upstashIncr(key, config.windowMs);
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
    // Em caso de falha no Redis, deixa passar (fail open)
  }

  return null;
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60 * 1000, keyPrefix: "auth" },
  payment: { limit: 5, windowMs: 60 * 1000, keyPrefix: "payment" },
  forgotPassword: { limit: 3, windowMs: 15 * 60 * 1000, keyPrefix: "forgot" },
} as const;
