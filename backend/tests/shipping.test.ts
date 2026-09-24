import { describe, expect, it, vi } from "vitest";
import { calculateShipping, SHIPPING_OPTION_IDS } from "@/lib/shipping";

const item = {
  weight: 0.3,
  height: 5,
  width: 10,
  length: 15,
  quantity: 1,
};

describe("shipping fails closed without fictitious production prices", () => {
  it("returns Correios as unavailable when the integration token is absent", async () => {
    vi.stubEnv("MELHOR_ENVIO_TOKEN", "");

    const options = await calculateShipping("30110-000", [item], {
      correiosEnabled: true,
      mototaxiEnabled: false,
      storePickupEnabled: false,
      mototaxiPrice: 12,
    });

    expect(options).toEqual([
      expect.objectContaining({
        id: "correios-unavailable",
        price: 0,
        available: false,
      }),
    ]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not replace a network failure with a made-up PAC or SEDEX quote", async () => {
    vi.stubEnv("MELHOR_ENVIO_TOKEN", "synthetic-offline-token");
    vi.stubEnv("MELHOR_ENVIO_SANDBOX", "true");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const options = await calculateShipping("30110-000", [item], {
      correiosEnabled: true,
      mototaxiEnabled: false,
      storePickupEnabled: false,
      mototaxiPrice: 12,
    });

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ id: "correios-unavailable", available: false, price: 0 });
    expect(consoleError).toHaveBeenCalled();
  });

  it("offers mototaxi only for an Itaúna CEP using the configured server price", async () => {
    const config = {
      correiosEnabled: false,
      mototaxiEnabled: true,
      storePickupEnabled: false,
      mototaxiPrice: 12.34,
    };

    const local = await calculateShipping("35680-123", [item], config);
    const remote = await calculateShipping("30110-000", [item], config);

    expect(local).toEqual([
      expect.objectContaining({ id: SHIPPING_OPTION_IDS.mototaxi, price: 12.34, available: true }),
    ]);
    expect(remote).toEqual([]);
  });

  it("uses the selected address locality instead of trusting only the typed CEP", async () => {
    const config = {
      correiosEnabled: false,
      mototaxiEnabled: true,
      storePickupEnabled: false,
      mototaxiPrice: 10,
    };

    const local = await calculateShipping("30110-000", [item], config, { city: "Itaúna", state: "MG" });
    const remote = await calculateShipping("35680-000", [item], config, { city: "Belo Horizonte", state: "MG" });

    expect(local).toContainEqual(expect.objectContaining({ id: SHIPPING_OPTION_IDS.mototaxi, price: 10 }));
    expect(remote).toEqual([]);
  });

  it("shows the configured store address for free pickup", async () => {
    const options = await calculateShipping("", [item], {
      correiosEnabled: false,
      mototaxiEnabled: false,
      storePickupEnabled: true,
      mototaxiPrice: 10,
      storeAddress: "Rua da Loja, 10",
      storeCity: "Itaúna",
      storeState: "MG",
      storeZipCode: "35680000",
    });
    expect(options).toEqual([
      expect.objectContaining({ id: SHIPPING_OPTION_IDS.pickup, available: true, price: 0, description: expect.stringContaining("Rua da Loja, 10") }),
    ]);
  });
  it("[26] refuses a shipping token when the environment selector is absent", async () => {
    vi.stubEnv("MELHOR_ENVIO_TOKEN", "synthetic-offline-token");
    vi.stubEnv("MELHOR_ENVIO_SANDBOX", "");

    const options = await calculateShipping("30110-000", [item], {
      correiosEnabled: true,
      mototaxiEnabled: false,
      storePickupEnabled: false,
      mototaxiPrice: 12,
    });

    expect(options).toEqual([
      expect.objectContaining({ id: "correios-unavailable", available: false, price: 0 }),
    ]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("uses the explicit Melhor Envio Sandbox host when network is mocked", async () => {
    vi.stubEnv("MELHOR_ENVIO_TOKEN", "synthetic-offline-token");
    vi.stubEnv("MELHOR_ENVIO_SANDBOX", "true");
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify([{ id: 1, price: "18.90", delivery_time: 4 }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const options = await calculateShipping("30110-000", [item], {
      correiosEnabled: true,
      mototaxiEnabled: false,
      storePickupEnabled: false,
      mototaxiPrice: 12,
    });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate"
    );
    expect(options).toContainEqual(
      expect.objectContaining({ id: SHIPPING_OPTION_IDS.pac, available: true, price: 18.9 })
    );
  });
});
