"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  name?: string;
  title?: string;
  slug?: string;
  mediaUrl?: string;
  playStoreStatus: string;
  playStoreReviewedAt?: string | null;
  playStoreReviewedBy?: string | null;
  playStoreReviewNotes?: string | null;
  policyReviewStatus: string;
  contentClassification: string;
  policyReviewedAt?: string | null;
  policyReviewedBy?: string | null;
  policyReviewNotes?: string | null;
  distributionChannels: string[];
};

type Payload = {
  products: Item[];
  categories: Item[];
  storyGroups: Item[];
  storyItems: Item[];
};

const sections = [
  ["PRODUCT", "Produtos", "products"],
  ["CATEGORY", "Categorias", "categories"],
  ["STORY_GROUP", "Grupos de stories", "storyGroups"],
  ["STORY_ITEM", "Itens de stories", "storyItems"],
] as const;

export default function PlayDistributionPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [section, setSection] = useState<(typeof sections)[number]>(sections[0]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/play-distribution", {
      credentials: "include",
    });
    const payload = await response.json();
    setData(payload.data ?? null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const items = useMemo(() => {
    const rows = data?.[section[2]] ?? [];
    if (filter === "ALL") return rows;
    if (filter === "PENDING") {
      return rows.filter((item) => item.playStoreStatus !== "PLAY_ALLOWED");
    }
    return rows.filter((item) => item.playStoreStatus === filter);
  }, [data, filter, section]);

  async function review(item: Item, action: "APPROVE" | "BLOCK" | "REVIEW_REQUIRED") {
    const notes = window.prompt(
      "Registre a justificativa da revisão (mínimo 10 caracteres):",
      item.playStoreReviewNotes ?? ""
    );
    if (!notes || notes.trim().length < 10) return;
    let classification = item.contentClassification;
    let confirmation: string | undefined;
    if (action === "APPROVE") {
      const chosen = window.prompt(
        "Classificação permitida: GENERAL ou LINGERIE_NEUTRAL",
        classification === "LINGERIE_NEUTRAL" ? "LINGERIE_NEUTRAL" : "GENERAL"
      );
      if (chosen !== "GENERAL" && chosen !== "LINGERIE_NEUTRAL") return;
      classification = chosen;
      confirmation = window.prompt(
        "Digite HABILITAR_GOOGLE_PLAY para confirmar:"
      ) ?? undefined;
      if (confirmation !== "HABILITAR_GOOGLE_PLAY") return;
    }
    if (action === "REVIEW_REQUIRED") classification = "REVIEW_REQUIRED";

    const response = await fetch("/api/admin/play-distribution", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: section[0],
        id: item.id,
        action,
        classification,
        notes,
        confirmation,
      }),
    });
    if (!response.ok) {
      const payload = await response.json();
      window.alert(payload.error ?? "Não foi possível salvar.");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-3xl font-black text-gray-900">Distribuição Google Play</h1>
      <p className="mt-2 max-w-3xl text-sm text-gray-600">
        Conteúdo não revisado fica fora do aplicativo. Habilitar exige classificação
        permitida, justificativa e confirmação explícita.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {sections.map((entry) => (
          <button
            key={entry[0]}
            type="button"
            onClick={() => setSection(entry)}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              section[0] === entry[0]
                ? "bg-pink-500 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            {entry[1]}
          </button>
        ))}
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="PENDING">Pendentes/bloqueados</option>
          <option value="ALL">Todos</option>
          <option value="PLAY_ALLOWED">Aprovados</option>
          <option value="PLAY_BLOCKED">Bloqueados</option>
          <option value="PLAY_REVIEW_REQUIRED">Revisão necessária</option>
          <option value="UNCLASSIFIED">Não classificados</option>
        </select>
      </div>

      {loading ? (
        <p className="mt-8 text-gray-500">Carregando…</p>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">
                    {item.name ?? item.title ?? item.slug ?? item.mediaUrl ?? item.id}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.playStoreStatus} · {item.contentClassification} ·{" "}
                    {item.distributionChannels.join(", ")}
                  </p>
                  {item.playStoreReviewNotes && (
                    <p className="mt-2 text-sm text-gray-600">{item.playStoreReviewNotes}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => review(item, "APPROVE")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                    Habilitar Play
                  </button>
                  <button onClick={() => review(item, "REVIEW_REQUIRED")} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white">
                    Pedir revisão
                  </button>
                  <button onClick={() => review(item, "BLOCK")} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white">
                    Bloquear
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!items.length && <p className="text-sm text-gray-500">Nenhum item neste filtro.</p>}
        </div>
      )}
    </div>
  );
}
