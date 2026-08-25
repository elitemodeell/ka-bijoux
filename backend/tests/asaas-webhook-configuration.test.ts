import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ asaasRequest: vi.fn() }));
vi.mock("@/lib/payment", () => ({
  asaasRequest: mocks.asaasRequest,
  PaymentUnavailableError: class PaymentUnavailableError extends Error {},
}));

import { POST } from "@/app/api/internal/asaas/ensure-webhook/route";

const OPERATIONS_TOKEN = "internal-operation-token-with-more-than-32-chars";

function request(token = OPERATIONS_TOKEN) {
  return new NextRequest("https://kabijoux.com.br/api/internal/asaas/ensure-webhook", {
    method: "POST",
    headers: { "x-internal-operations-token": token },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INTERNAL_OPERATIONS_TOKEN = OPERATIONS_TOKEN;
  process.env.ASAAS_WEBHOOK_TOKEN = "asaas-webhook-token-with-more-than-32-chars";
});

describe("configuração protegida do webhook Asaas", () => {
  it("não aceita chamada sem o token operacional", async () => {
    const response = await POST(request("invalid"));
    expect(response.status).toBe(401);
    expect(mocks.asaasRequest).not.toHaveBeenCalled();
  });

  it("atualiza webhook existente com token e eventos obrigatórios", async () => {
    mocks.asaasRequest.mockResolvedValueOnce({
      data: [{ id: "webhook-1", url: "https://kabijoux.com.br/api/payment/webhook" }],
    }).mockResolvedValueOnce({ id: "webhook-1" });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.action).toBe("updated");
    expect(mocks.asaasRequest).toHaveBeenLastCalledWith("/webhooks/webhook-1", expect.objectContaining({ method: "PUT" }));
    const body = JSON.parse(mocks.asaasRequest.mock.calls[1][1].body);
    expect(body.authToken).toBe(process.env.ASAAS_WEBHOOK_TOKEN);
    expect(body.events).toContain("PAYMENT_RECEIVED");
    expect(body.events).toContain("PAYMENT_REFUNDED");
    expect(body.events).toContain("PAYMENT_OVERDUE");
  });
});
