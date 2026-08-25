import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { generateKeyPairSync, randomBytes } from "node:crypto";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appleAuthCredential: {
      upsert: mocks.upsert,
      findUnique: mocks.findUnique,
    },
  },
}));

import {
  exchangeAppleAuthorizationCode,
  revokeStoredAppleAuthorization,
  storeAppleRefreshToken,
} from "@/lib/apple-sign-in";

const privateKey = generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({
  type: "pkcs8",
  format: "pem",
}).toString();
const appleSigningKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const applePublicJwk = appleSigningKeys.publicKey.export({ format: "jwk" });

function appleIdentityToken(subject: string) {
  return jwt.sign({ sub: subject }, appleSigningKeys.privateKey, {
    algorithm: "RS256",
    audience: "com.kabijoux.app",
    issuer: "https://appleid.apple.com",
    expiresIn: "5m",
    keyid: "apple-signing-key",
  });
}

function mockAppleExchange(subject: string) {
  return vi.fn().mockImplementation(async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith("/auth/keys")) {
      return new Response(JSON.stringify({ keys: [{ ...applePublicJwk, kid: "apple-signing-key" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      refresh_token: "refresh-token",
      id_token: appleIdentityToken(subject),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APPLE_SIGN_IN_TEAM_ID = "YF8JRZUL75";
  process.env.APPLE_SIGN_IN_KEY_ID = "36Q79989V9";
  process.env.APPLE_SIGN_IN_CLIENT_ID = "com.kabijoux.app";
  process.env.APPLE_SIGN_IN_PRIVATE_KEY = privateKey;
  process.env.APPLE_REFRESH_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  mocks.upsert.mockResolvedValue({ id: "credential-1" });
});

describe("Apple server token lifecycle", () => {
  it("troca o código e vincula o subject retornado pela Apple", async () => {
    vi.stubGlobal("fetch", mockAppleExchange("apple-subject"));

    await expect(exchangeAppleAuthorizationCode("authorization-code", "apple-subject"))
      .resolves.toEqual({ refreshToken: "refresh-token" });
  });

  it("rejeita código trocado por uma identidade Apple diferente", async () => {
    vi.stubGlobal("fetch", mockAppleExchange("another-subject"));

    await expect(exchangeAppleAuthorizationCode("authorization-code", "apple-subject")).rejects.toThrow();
  });

  it("criptografa o refresh token antes de persistir", async () => {
    await storeAppleRefreshToken({
      customerId: "customer-1",
      authUserId: "11111111-1111-4111-8111-111111111111",
      appleSubject: "apple-subject",
      refreshToken: "plain-refresh-token",
    });
    const input = mocks.upsert.mock.calls[0][0];
    expect(JSON.stringify(input)).not.toContain("plain-refresh-token");
    expect(input.create.refreshTokenCiphertext).toBeTruthy();
    expect(input.create.refreshTokenIv).toBeTruthy();
    expect(input.create.refreshTokenAuthTag).toBeTruthy();
  });

  it("descriptografa e revoga o refresh token armazenado", async () => {
    await storeAppleRefreshToken({
      customerId: "customer-1",
      authUserId: "11111111-1111-4111-8111-111111111111",
      appleSubject: "apple-subject",
      refreshToken: "plain-refresh-token",
    });
    const stored = mocks.upsert.mock.calls[0][0].create;
    mocks.findUnique.mockResolvedValue(stored);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(revokeStoredAppleAuthorization("customer-1")).resolves.toBe("revoked");
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("token")).toBe("plain-refresh-token");
    expect(body.get("token_type_hint")).toBe("refresh_token");
  });
});
