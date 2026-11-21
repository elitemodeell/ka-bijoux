import { expect, it } from "vitest";
import { planKaPhotoPush, resetPhotoPushDelivery, sendPreparedPhotoPush } from "@/lib/bling-photo-push";

const own = "https://sxohqngzypmxtmuulfoa.supabase.co/storage/v1/object/public/products/capa-aprovada.png";
const rejected = "/uploads/products/6-fone-bluetooth-p47-com-opcoes-de-cores-3104000004296-azul.png";
const bling = "https://orgbling.s3.amazonaws.com/antiga.jpg";

it("prepares a Bling update only for the linked product and approved public photos", () => {
  const plan = planKaPhotoPush({
    productId: "cmr6i1pu5001drhf8cvq4gl22",
    blingId: "16648691520",
    sku: "3104000004296",
    images: [
      { url: rejected, order: 0 },
      { url: bling, order: 1 },
      { url: own, order: 2 },
      { url: "/uploads/products/capa-local.png", order: 3 },
    ],
    variations: [
      { sku: "AZUL", imageUrl: own },
      { sku: "ROSA", imageUrl: own, blingId: "16648691521" },
    ],
    linkedVariations: [{ sku: "ROSA", blingId: "16648691521" }],
  });

  expect(plan.status).toBe("ready");
  expect(plan.targets.map((target) => target.path)).toEqual(["/produtos/16648691520", "/produtos/16648691521"]);
  expect(plan.targets[0].body.midia.imagens.externas).toEqual([{ link: own }]);
  expect(JSON.stringify(plan.targets)).not.toContain("internas");
  expect(plan.blocked.map((item) => item.reason)).toContain("variacao-sem-id-bling-vinculado");
  expect(planKaPhotoPush({ productId: "p", blingId: null, sku: "1", images: [{ url: own }] }).status).toBe("skipped");
});

it("retries transient failures, does not repeat a delivered payload, and never calls Bling by itself", async () => {
  resetPhotoPushDelivery();
  const plan = planKaPhotoPush({
    productId: "p1",
    blingId: "10",
    sku: "SKU-1",
    images: [{ url: own, order: 0 }],
  });
  const calls: string[] = [];
  let failures = 0;
  const fetcher = (async (url: string) => {
    calls.push(url);
    failures += 1;
    if (failures < 3) return new Response("busy", { status: 503 });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;

  const first = await sendPreparedPhotoPush(plan, { token: "test-token", fetcher, sleep: async () => undefined });
  const second = await sendPreparedPhotoPush(plan, { token: "test-token", fetcher, sleep: async () => undefined });

  expect(first.sent).toHaveLength(1);
  expect(first.attempts.map((attempt) => attempt.status)).toEqual([503, 503, 200]);
  expect(second.skipped).toBe("ja-enviado");
  expect(calls).toEqual([
    "https://api.bling.com.br/Api/v3/produtos/10",
    "https://api.bling.com.br/Api/v3/produtos/10",
    "https://api.bling.com.br/Api/v3/produtos/10",
  ]);
});
