import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const routeMocks = vi.hoisted(() => ({
  loadToken: vi.fn(),
  assertAccountIdentity: vi.fn(),
  processWebhook: vi.fn(),
}));

vi.mock("@/lib/payments/config", () => ({
  loadAsaasWebhookToken: routeMocks.loadToken,
}));

vi.mock("@/lib/payments/payment-service", () => ({
  getPaymentService: () => ({
    assertAccountIdentity: routeMocks.assertAccountIdentity,
  }),
}));

vi.mock("@/lib/payments/webhook-processor", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/payments/webhook-processor")
  >();
  return {
    ...actual,
    processAsaasWebhook: routeMocks.processWebhook,
  };
});

import { POST } from "@/app/api/webhooks/asaas/route";
import { hashAsaasWebhookPayload } from "@/lib/payments/webhook-processor";

const validToken = "webhook-token-with-more-than-32-characters";
const rawBody = JSON.stringify({
  id: "event-route-1",
  event: "PAYMENT_RECEIVED",
  payment: { id: "pay-1", status: "RECEIVED" },
});

function request(token?: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token !== undefined) headers.set("asaas-access-token", token);
  return new NextRequest("http://localhost/api/webhooks/asaas", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMocks.loadToken.mockReturnValue(validToken);
  routeMocks.assertAccountIdentity.mockResolvedValue({
    provider: "ASAAS",
    environment: "production",
    accountId: "wallet-ka-tests",
    legalName: "KABIJOUX LTDA",
    cpfCnpj: "31042012000102",
  });
  routeMocks.processWebhook.mockResolvedValue({
    outcome: "processed",
    httpStatus: 200,
    externalEventId: "event-route-1",
    reason: "payment_received",
  });
});

describe("POST /api/webhooks/asaas authentication", () => {
  it("[12] returns 401 when asaas-access-token is missing", async () => {
    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(routeMocks.processWebhook).not.toHaveBeenCalled();
  });

  it("[13] returns 401 when asaas-access-token is invalid", async () => {
    const response = await POST(request("invalid-webhook-token"));

    expect(response.status).toBe(401);
    expect(routeMocks.processWebhook).not.toHaveBeenCalled();
  });

  it("[14] accepts a valid token and passes the exact raw body and hash to the processor", async () => {
    const response = await POST(request(validToken));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      retry: false,
      outcome: "processed",
      eventId: "event-route-1",
    });
    expect(routeMocks.processWebhook).toHaveBeenCalledTimes(1);
    expect(routeMocks.processWebhook).toHaveBeenCalledWith({
      rawBody,
      payloadHash: hashAsaasWebhookPayload(rawBody),
    });
  });

  it("fails closed when the configured Asaas account cannot be validated", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    routeMocks.assertAccountIdentity.mockRejectedValueOnce(
      new Error("wrong account")
    );

    const response = await POST(request(validToken));

    expect(response.status).toBe(503);
    expect(routeMocks.processWebhook).not.toHaveBeenCalled();
  });
});
