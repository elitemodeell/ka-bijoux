import {
  createCipheriv,
  createDecipheriv,
  createPublicKey,
  randomBytes,
  type JsonWebKey as NodeJsonWebKey,
} from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUER = "https://appleid.apple.com";

export class AppleSignInServerError extends Error {
  constructor(message: string, public readonly operation: "configuration" | "exchange" | "storage" | "revocation") {
    super(message);
    this.name = "AppleSignInServerError";
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new AppleSignInServerError("Configuração Apple indisponível.", "configuration");
  return value;
}

function appleConfiguration() {
  return {
    teamId: requiredEnvironment("APPLE_SIGN_IN_TEAM_ID"),
    keyId: requiredEnvironment("APPLE_SIGN_IN_KEY_ID"),
    clientId: requiredEnvironment("APPLE_SIGN_IN_CLIENT_ID"),
    privateKey: requiredEnvironment("APPLE_SIGN_IN_PRIVATE_KEY").replace(/\\n/g, "\n"),
  };
}

function createAppleClientSecret() {
  const config = appleConfiguration();
  return {
    clientId: config.clientId,
    secret: jwt.sign({}, config.privateKey, {
      algorithm: "ES256",
      audience: APPLE_ISSUER,
      expiresIn: "5m",
      issuer: config.teamId,
      keyid: config.keyId,
      subject: config.clientId,
    }),
  };
}

function encryptionKey(): Buffer {
  const key = Buffer.from(requiredEnvironment("APPLE_REFRESH_TOKEN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new AppleSignInServerError("Configuração Apple indisponível.", "configuration");
  return key;
}

function encryptRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptRefreshToken(ciphertext: string, iv: string, authTag: string) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function verifyAppleIdentityToken(identityToken: string, clientId: string): Promise<string | null> {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || decoded.header.alg !== "RS256" || typeof decoded.header.kid !== "string") return null;

  const keysResponse = await fetch(APPLE_KEYS_URL, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const keysPayload = await keysResponse.json().catch(() => null) as {
    keys?: Array<NodeJsonWebKey & { kid?: string }>;
  } | null;
  const jwk = keysPayload?.keys?.find((key) => key.kid === decoded.header.kid);
  if (!keysResponse.ok || !jwk) return null;

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const verified = jwt.verify(identityToken, publicKey, {
    algorithms: ["RS256"],
    audience: clientId,
    issuer: APPLE_ISSUER,
  });
  return typeof verified === "object" && typeof verified.sub === "string" ? verified.sub : null;
}

export async function exchangeAppleAuthorizationCode(authorizationCode: string, expectedSubject: string) {
  const { clientId, secret } = createAppleClientSecret();
  const response = await fetch(APPLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      code: authorizationCode,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json().catch(() => null) as { refresh_token?: unknown; id_token?: unknown } | null;
  const refreshToken = typeof payload?.refresh_token === "string" ? payload.refresh_token : "";
  const identityToken = typeof payload?.id_token === "string" ? payload.id_token : "";
  const verifiedSubject = identityToken ? await verifyAppleIdentityToken(identityToken, clientId).catch(() => null) : null;
  if (!response.ok || !refreshToken || verifiedSubject !== expectedSubject) {
    throw new AppleSignInServerError("Não foi possível validar a autorização Apple.", "exchange");
  }
  return { refreshToken };
}

export async function storeAppleRefreshToken(input: {
  customerId: string;
  authUserId: string;
  appleSubject: string;
  refreshToken: string;
}) {
  const encrypted = encryptRefreshToken(input.refreshToken);
  try {
    await prisma.appleAuthCredential.upsert({
      where: { customerId: input.customerId },
      create: {
        customerId: input.customerId,
        authUserId: input.authUserId,
        appleSubject: input.appleSubject,
        refreshTokenCiphertext: encrypted.ciphertext,
        refreshTokenIv: encrypted.iv,
        refreshTokenAuthTag: encrypted.authTag,
      },
      update: {
        authUserId: input.authUserId,
        appleSubject: input.appleSubject,
        refreshTokenCiphertext: encrypted.ciphertext,
        refreshTokenIv: encrypted.iv,
        refreshTokenAuthTag: encrypted.authTag,
      },
    });
  } catch {
    throw new AppleSignInServerError("Não foi possível armazenar a autorização Apple.", "storage");
  }
}

export async function revokeStoredAppleAuthorization(customerId: string): Promise<"revoked" | "missing"> {
  const credential = await prisma.appleAuthCredential.findUnique({ where: { customerId } });
  if (!credential) return "missing";

  const refreshToken = decryptRefreshToken(
    credential.refreshTokenCiphertext,
    credential.refreshTokenIv,
    credential.refreshTokenAuthTag,
  );
  const { clientId, secret } = createAppleClientSecret();
  const response = await fetch(APPLE_REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: secret,
      token: refreshToken,
      token_type_hint: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new AppleSignInServerError("Não foi possível revogar a autorização Apple.", "revocation");
  return "revoked";
}
