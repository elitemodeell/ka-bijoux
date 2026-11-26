"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/admin/Header";

type CuratedProduct = {
  id: string;
  name: string;
  sku: string | null;
  slug: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  categorySlug: string;
};

type OrderedProduct = {
  id: string;
  name: string;
  sku: string | null;
  homeSortOrder: number | null;
  stock: number;
  active: boolean;
  category: { name: string; slug: string };
  images: Array<{ url: string }>;
};

type DisplayProduct = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  active: boolean;
  category: { name: string; slug: string };
  image: string | null;
};

export default function CuradoriaPage() {
  const [candidates, setCandidates] = useState<CuratedProduct[]>([]);
  const [ordered, setOrdered] = useState<OrderedProduct[]>([]);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/admin/home-curation", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar a curadoria.");
        if (!active) return;
        const nextCandidates = (payload.data?.candidates ?? []) as CuratedProduct[];
        const nextOrdered = (payload.data?.ordered ?? []) as OrderedProduct[];
        setCandidates(nextCandidates);
        setOrdered(nextOrdered);
        setOrderIds(nextOrdered.map(({ id }) => id));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Erro ao carregar a curadoria.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const productById = useMemo(() => new Map(candidates.map((product) => [product.id, product])), [candidates]);
  const orderedProducts = useMemo<DisplayProduct[]>(() => orderIds.flatMap((id) => {
    const candidate = productById.get(id);
    if (candidate) return [{ id, name: candidate.name, sku: candidate.sku, stock: candidate.stock, active: true, category: { name: candidate.category, slug: candidate.categorySlug }, image: candidate.image }];
    const existing = ordered.find((product) => product.id === id);
    return existing ? [{ id, name: existing.name, sku: existing.sku, stock: existing.stock, active: existing.active, category: existing.category, image: existing.images[0]?.url ?? null }] : [];
  }), [orderIds, ordered, productById]);
  const selectedIds = useMemo(() => new Set(orderIds), [orderIds]);
  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return candidates.filter((product) => !selectedIds.has(product.id) &&
      (!normalized || `${product.name} ${product.sku ?? ""} ${product.category}`.toLocaleLowerCase("pt-BR").includes(normalized)));
  }, [candidates, query, selectedIds]);

  function moveProduct(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= orderIds.length) return;
    setOrderIds((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  function addProduct(id: string) {
    if (orderIds.length >= 30 || selectedIds.has(id)) return;
    setOrderIds((current) => [...current, id]);
    setSaved(false);
  }

  function removeProduct(id: string) {
    setOrderIds((current) => current.filter((productId) => productId !== id));
    setSaved(false);
  }

  async function saveOrder() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/admin/home-curation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: orderIds }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar a ordem.");
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao salvar a curadoria.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Header
        title="Curadoria da vitrine"
        subtitle="Organize a primeira impressão da loja sem alterar os dados comerciais nem gerar um novo build."
        action={<button type="button" onClick={() => void saveOrder()} disabled={loading || saving} className="btn-primary disabled:opacity-50">{saving ? "Salvando..." : "Salvar ordem"}</button>}
      />

      <div className="mb-5 rounded-2xl border border-pink-100 bg-pink-50/70 p-4 text-sm leading-6 text-gray-700">
        A lista inclui somente produtos publicados, com fotografia oficial aprovada e compra liberada para o aplicativo. A ordem é editorial e fica separada da sincronização comercial do Bling. Você pode destacar até 30 produtos; os demais continuam no catálogo.
      </div>
      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {saved && <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Ordem salva. Site e aplicativo receberam a nova sequência.</div>}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">Produtos em destaque ({orderIds.length}/30)</h2>
              <p className="mt-1 text-xs text-gray-500">Use as setas para ordenar. Produtos indisponíveis ficam ocultos da vitrine até serem regularizados.</p>
            </div>
          </div>
          {loading ? <p className="py-10 text-center text-sm text-gray-500">Carregando produtos...</p> : orderedProducts.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">Nenhum produto selecionado. Adicione produtos da lista ao lado.</p>
          ) : (
            <ol className="space-y-3">
              {orderedProducts.map((product, index) => (
                <li key={product.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3">
                  <span className="w-7 shrink-0 text-center text-sm font-bold text-pink-600">{index + 1}</span>
                  {product.image ? <img src={product.image} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">Sem foto</div>}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-gray-800">{product.name}</p>
                    <p className="mt-1 text-xs text-gray-500">{product.category.name} · SKU {product.sku ?? "não informado"}{product.stock <= 0 || !product.active ? " · indisponível no momento" : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" aria-label={`Mover ${product.name} para cima`} onClick={() => moveProduct(index, -1)} disabled={index === 0} className="rounded-lg border px-2 py-1 text-sm disabled:opacity-30">↑</button>
                    <button type="button" aria-label={`Mover ${product.name} para baixo`} onClick={() => moveProduct(index, 1)} disabled={index === orderIds.length - 1} className="rounded-lg border px-2 py-1 text-sm disabled:opacity-30">↓</button>
                  </div>
                  <button type="button" onClick={() => removeProduct(product.id)} className="rounded-lg px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Remover</button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-900">Produtos disponíveis</h2>
            <p className="mt-1 text-xs text-gray-500">{filteredCandidates.length} produtos podem ser selecionados conforme estoque e aprovação atuais.</p>
          </div>
          <label className="mb-4 block">
            <span className="sr-only">Buscar produto</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, SKU ou categoria" className="input-field" />
          </label>
          <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
            {filteredCandidates.map((product) => (
              <div key={product.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5">
                <img src={product.image} alt="" loading="lazy" className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-semibold text-gray-800">{product.name}</p>
                  <p className="mt-1 text-[11px] text-gray-500">{product.category} · estoque {product.stock} · R$ {Number(product.price).toFixed(2).replace(".", ",")}</p>
                </div>
                <button type="button" onClick={() => addProduct(product.id)} disabled={orderIds.length >= 30} className="min-h-10 rounded-lg bg-pink-50 px-3 text-xs font-bold text-pink-700 disabled:opacity-40">Adicionar</button>
              </div>
            ))}
            {!loading && filteredCandidates.length === 0 && <p className="py-8 text-center text-sm text-gray-500">Nenhum outro produto disponível corresponde à busca.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
