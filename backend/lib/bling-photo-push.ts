import { createHash } from "node:crypto";
import { isBlingHostedPhoto, officialDatabaseGallery } from "@/lib/catalog-photo";

const origin = "https://api.bling.com.br/Api/v3";
const maxAttempts = 3;

export type PhotoPushImage = { url: string; order?: number };
export type PhotoPushVariation = {
  sku?: string | null;
  imageUrl?: string | null;
  blingId?: string | null;
};
export type LinkedVariation = { sku: string; blingId: string };

export type PhotoPushTarget = {
  blingId: string;
  sku: string;
  role: "product" | "variation";
  method: "PUT";
  path: string;
  body: {
    midia: {
      imagens: {
        externas: { link: string }[];
      };
    };
  };
};

export type PhotoPushPlan = {
  status: "ready" | "skipped";
  reason: string;
  fingerprint: string | null;
  targets: PhotoPushTarget[];
  blocked: { sku: string; reason: string }[];
};

type SendResult = {
  sent: PhotoPushTarget[];
  skipped: string | null;
  attempts: { blingId: string; attempt: number; ok: boolean; status: number | null }[];
};

const delivered = new Map<string, string>();

export function planKaPhotoPush(input: {
  productId: string;
  blingId?: string | null;
  sku?: string | null;
  images?: PhotoPushImage[];
  variations?: PhotoPushVariation[];
  linkedVariations?: LinkedVariation[];
}): PhotoPushPlan {
  const blingId = String(input.blingId ?? "").trim();
  const sku = String(input.sku ?? "").trim();
  if (!/^\d+$/.test(blingId) || !sku) {
    return { status: "skipped", reason: "produto-sem-id-ou-sku-vinculado", fingerprint: null, targets: [], blocked: [] };
  }

  const approved = publicApprovedPhotos(input.images ?? [], input.productId);
  const targets: PhotoPushTarget[] = [];
  const blocked: { sku: string; reason: string }[] = [];
  if (approved.length) {
    targets.push(target(blingId, sku, "product", approved));
  } else {
    blocked.push({ sku, reason: "sem-foto-propria-publica-aprovada" });
  }

  const links = new Map<string, string>();
  for (const link of input.linkedVariations ?? []) {
    const linkSku = link.sku.trim();
    const linkId = link.blingId.trim();
    if (!linkSku || !/^\d+$/.test(linkId) || linkId === blingId || links.has(linkSku)) continue;
    links.set(linkSku, linkId);
  }
  for (const variation of input.variations ?? []) {
    const variationSku = String(variation.sku ?? "").trim();
    const explicitId = String(variation.blingId ?? "").trim();
    const linkedId = explicitId || (variationSku ? links.get(variationSku) : "");
    if (!variation.imageUrl) continue;
    if (!variationSku || !linkedId || !/^\d+$/.test(linkedId)) {
      blocked.push({ sku: variationSku || "(sem-sku)", reason: "variacao-sem-id-bling-vinculado" });
      continue;
    }
    const photos = publicApprovedPhotos([{ url: variation.imageUrl }], input.productId);
    if (!photos.length) {
      blocked.push({ sku: variationSku, reason: "foto-de-variacao-nao-aprovada" });
      continue;
    }
    targets.push(target(linkedId, variationSku, "variation", photos));
  }

  if (!targets.length) {
    return { status: "skipped", reason: blocked[0]?.reason ?? "nada-para-enviar", fingerprint: null, targets, blocked };
  }
  return {
    status: "ready",
    reason: "fotos-proprias-prontas-para-o-bling",
    fingerprint: fingerprint(targets),
    targets,
    blocked,
  };
}

export async function sendPreparedPhotoPush(plan: PhotoPushPlan, options: {
  token: string;
  fetcher: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (entry: { level: "info" | "error"; blingId: string; attempt: number; message: string }) => void;
}): Promise<SendResult> {
  if (plan.status !== "ready" || !plan.fingerprint) {
    return { sent: [], skipped: plan.reason, attempts: [] };
  }
  const key = plan.targets.map((item) => item.blingId).sort().join(",");
  if (delivered.get(key) === plan.fingerprint) {
    return { sent: [], skipped: "ja-enviado", attempts: [] };
  }
  const sent: PhotoPushTarget[] = [];
  const attempts: SendResult["attempts"] = [];
  const sleep = options.sleep ?? (async () => undefined);
  for (const item of plan.targets) {
    let deliveredTarget = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let status: number | null = null;
      try {
        const response = await options.fetcher(`${origin}${item.path}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${options.token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(item.body),
          redirect: "error",
        });
        status = response.status;
        attempts.push({ blingId: item.blingId, attempt, ok: response.ok, status });
        options.log?.({
          level: response.ok ? "info" : "error",
          blingId: item.blingId,
          attempt,
          message: response.ok ? "foto própria enviada" : `Bling recusou HTTP ${response.status}`,
        });
        if (response.ok) {
          deliveredTarget = true;
          sent.push(item);
          break;
        }
        if (response.status < 500 && response.status !== 429) break;
      } catch (error) {
        attempts.push({ blingId: item.blingId, attempt, ok: false, status });
        options.log?.({
          level: "error",
          blingId: item.blingId,
          attempt,
          message: error instanceof Error ? error.message : "falha de rede",
        });
      }
      if (attempt < maxAttempts) await sleep(attempt * 400);
    }
    if (!deliveredTarget) break;
  }
  if (sent.length === plan.targets.length) delivered.set(key, plan.fingerprint);
  return { sent, skipped: sent.length === plan.targets.length ? null : "envio-incompleto", attempts };
}

export function resetPhotoPushDelivery() {
  delivered.clear();
}

function publicApprovedPhotos(images: PhotoPushImage[], productId: string) {
  const ordered = [...images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return officialDatabaseGallery(ordered.map((image) => image.url), productId)
    .filter((url) => /^https:\/\//i.test(url) && !isBlingHostedPhoto(url));
}

function target(blingId: string, sku: string, role: "product" | "variation", links: string[]): PhotoPushTarget {
  return {
    blingId,
    sku,
    role,
    method: "PUT",
    path: `/produtos/${blingId}`,
    body: {
      midia: {
        imagens: {
          externas: links.map((link) => ({ link })),
        },
      },
    },
  };
}

function fingerprint(targets: PhotoPushTarget[]) {
  return createHash("sha256").update(JSON.stringify(targets)).digest("hex");
}
