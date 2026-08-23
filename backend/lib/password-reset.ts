import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "crypto";

const PASSWORD_RESET_CONTEXT = "ka-bijoux:password-reset:v1";

function getPasswordResetSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET é obrigatório para recuperação de senha.");
  }
  return "ka-bijoux-password-reset-local-only";
}

export function generatePasswordResetCode(): string {
  return randomInt(100000, 1000000).toString();
}

export function hashPasswordResetCode(email: string, code: string): string {
  return createHmac("sha256", getPasswordResetSecret())
    .update(
      `${PASSWORD_RESET_CONTEXT}:${email.trim().toLowerCase()}:${code}`
    )
    .digest("hex");
}

export function verifyPasswordResetCode(
  email: string,
  code: string,
  expectedHash: string
): boolean {
  const actual = Buffer.from(hashPasswordResetCode(email, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}
