"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/admin/Header";
import { PRICE_PRESETS } from "@/lib/catalog";

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

interface VariationRow {
  _key: string;
  id?: string;
  name: string;
  value: string;
  sku: string;
  imageUrl: string;
  stock: string;
  priceModifier: string;
  isDefault: boolean;
  order: string;
  active: boolean;
  _uploading?: boolean;
}

const emptyForm = {
  name: "", sku: "", brand: "", ean: "", description: "",
  benefits: "", howToUse: "", composition: "", careInstructions: "", packageContents: "",
  price: "", promotionalPrice: "", stock: "1", minStock: "5",
  weight: "0.15", height: "5", width: "10", length: "15",
  categoryId: "", subcategoryId: "",
  featured: false, isNew: true, active: true,
};

type FormState = typeof emptyForm;

let keyCounter = 0;
function newKey() { return `v-${++keyCounter}`; }

function emptyVariation(): VariationRow {
  return {
    _key: newKey(), name: "Cor", value: "",
    sku: "", imageUrl: "", stock: "0", priceModifier: "0",
    isDefault: false, order: "0", active: true,
  };
}

export default function EditarProdutoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [variations, setVariations] = useState<VariationRow[]>([]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === form.categoryId) ?? null,
    [categories, form.categoryId]
  );
  const subcategories = selectedCategory?.children ?? [];

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => setCategories(j.data ?? []));
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoadingProduct(true);
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((j) => {
        const p = j.data?.product ?? j.data;
        if (!p) return;
        setForm({
          name: p.name ?? "",
          sku: p.sku ?? "",
          brand: p.brand ?? "",
          ean: p.ean ?? "",
          description: p.description ?? "",
          benefits: p.benefits ?? "",
          howToUse: p.howToUse ?? "",
          composition: p.composition ?? "",
          careInstructions: p.careInstructions ?? "",
          packageContents: p.packageContents ?? "",
          price: p.price?.toString() ?? "",
          promotionalPrice: p.promotionalPrice?.toString() ?? "",
          stock: p.stock?.toString() ?? "0",
          minStock: p.minStock?.toString() ?? "5",
          weight: p.weight?.toString() ?? "0.15",
          height: p.height?.toString() ?? "5",
          width: p.width?.toString() ?? "10",
          length: p.length?.toString() ?? "15",
          categoryId: p.categoryId ?? "",
          subcategoryId: p.subcategoryId ?? "",
          featured: p.featured ?? false,
          isNew: p.isNew ?? false,
          active: p.active ?? true,
        });
        setImages((p.images ?? []).map((img: { url: string }) => img.url));
        setVariations(
          (p.variations ?? []).map((v: {
            id: string; name: string; value: string; sku?: string;
            imageUrl?: string; stock: number; priceModifier: number;
            isDefault: boolean; order: number; active: boolean;
          }) => ({
            _key: newKey(),
            id: v.id,
            name: v.name,
            value: v.value,
            sku: v.sku ?? "",
            imageUrl: v.imageUrl ?? "",
            stock: v.stock.toString(),
            priceModifier: v.priceModifier.toString(),
            isDefault: v.isDefault,
            order: v.order.toString(),
            active: v.active,
          }))
        );
      })
      .catch(() => setError("Erro ao carregar produto."))
      .finally(() => setLoadingProduct(false));
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      ...(name === "categoryId" ? { subcategoryId: "" } : {}),
    }));
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/products/upload", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao enviar imagem.");
        uploaded.push(json.data.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagens.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadVariationImage(key: string, file: File) {
    setVariations((prev) =>
      prev.map((v) => v._key === key ? { ...v, _uploading: true } : v)
    );
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/products/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao enviar imagem da variação.");
      setVariations((prev) =>
        prev.map((v) => v._key === key ? { ...v, imageUrl: json.data.url, _uploading: false } : v)
      );
    } catch {
      setVariations((prev) =>
        prev.map((v) => v._key === key ? { ...v, _uploading: false } : v)
      );
    }
  }

  function updateVariation(key: string, field: keyof VariationRow, value: string | boolean) {
    setVariations((prev) => prev.map((v) => {
      if (v._key !== key) return v;
      if (field === "isDefault" && value === true) {
        return { ...v, isDefault: true };
      }
      return { ...v, [field]: value };
    }));
    if (field === "isDefault" && value === true) {
      setVariations((prev) =>
        prev.map((v) => v._key === key ? v : { ...v, isDefault: false })
      );
    }
  }

  function removeVariation(key: string) {
    setVariations((prev) => prev.filter((v) => v._key !== key));
  }

  function addVariation() {
    const next = emptyVariation();
    next.order = String(variations.length);
    setVariations((prev) => [...prev, next]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku || null,
          brand: form.brand || null,
          ean: form.ean || null,
          description: form.description,
          benefits: form.benefits || null,
          howToUse: form.howToUse || null,
          composition: form.composition || null,
          careInstructions: form.careInstructions || null,
          packageContents: form.packageContents || null,
          price: parseFloat(form.price),
          promotionalPrice: form.promotionalPrice ? parseFloat(form.promotionalPrice) : null,
          stock: parseInt(form.stock),
          minStock: parseInt(form.minStock),
          weight: parseFloat(form.weight),
          height: parseFloat(form.height),
          width: parseFloat(form.width),
          length: parseFloat(form.length),
          categoryId: form.categoryId || undefined,
          subcategoryId: form.subcategoryId || null,
          featured: form.featured,
          isNew: form.isNew,
          active: form.active,
          images: images.map((url, order) => ({ url, order, alt: form.name })),
          variations: variations.map((v, i) => ({
            ...(v.id ? { id: v.id } : {}),
            name: v.name,
            value: v.value,
            sku: v.sku || null,
            imageUrl: v.imageUrl || null,
            stock: parseInt(v.stock) || 0,
            priceModifier: parseFloat(v.priceModifier) || 0,
            isDefault: v.isDefault,
            order: parseInt(v.order) ?? i,
            active: v.active,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao salvar."); return; }
      router.push("/admin/produtos");
    } finally {
      setLoading(false);
    }
  }

  if (loadingProduct) {
    return (
      <div>
        <Header title="Editar Produto" subtitle="Carregando..." />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Editar Produto" subtitle={form.name || "—"} />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">

            {/* Informações principais */}
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Informações principais</h3>
              <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome *</label>
                  <input name="name" value={form.name} onChange={handleChange} required className="input-field" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">SKU</label>
                  <input name="sku" value={form.sku} onChange={handleChange} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Marca</label>
                  <input name="brand" value={form.brand} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">EAN</label>
                  <input name="ean" value={form.ean} onChange={handleChange} className="input-field" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Descrição *</label>
                <textarea name="description" value={form.description} onChange={handleChange} required rows={6} className="input-field resize-y" />
              </div>
            </div>

            {/* Ficha técnica */}
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Ficha técnica</h3>
              <TechnicalTextarea name="benefits" label="Benefícios" value={form.benefits} onChange={handleChange} />
              <TechnicalTextarea name="composition" label="Composição" value={form.composition} onChange={handleChange} />
              <TechnicalTextarea name="howToUse" label="Modo de uso" value={form.howToUse} onChange={handleChange} />
              <TechnicalTextarea name="careInstructions" label="Cuidados" value={form.careInstructions} onChange={handleChange} />
              <TechnicalTextarea name="packageContents" label="Conteúdo da embalagem" value={form.packageContents} onChange={handleChange} />
            </div>

            {/* Preço */}
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Preço</h3>
              <div className="flex flex-wrap gap-2">
                {PRICE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, price: String(p) }))}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      form.price === String(p) ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-500 hover:bg-pink-100"
                    }`}
                  >
                    R${p}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Preço (R$) *</label>
                  <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required className="input-field" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Preço promocional (R$)</label>
                  <input name="promotionalPrice" type="number" step="0.01" min="0" value={form.promotionalPrice} onChange={handleChange} className="input-field" />
                </div>
              </div>
            </div>

            {/* Imagens */}
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Imagens</h3>
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {images.map((url, i) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-pink-50">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-pink-500 shadow"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => uploadImages(e.target.files)}
                className="input-field"
              />
              <p className="text-xs text-gray-400">{uploading ? "Enviando..." : "Adicione ou remova imagens."}</p>
            </div>

            {/* Variações de cor/modelo */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Variações de cor / modelo</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Cada variação é vendida por unidade. O cliente escolhe 1 cor antes de comprar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addVariation}
                  className="flex items-center gap-1.5 rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600 transition-colors"
                >
                  + Adicionar cor
                </button>
              </div>

              {variations.length === 0 && (
                <p className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                  Nenhuma variação cadastrada. Clique em "Adicionar cor" para começar.
                </p>
              )}

              <div className="space-y-3">
                {variations.map((v) => (
                  <div
                    key={v._key}
                    className={`rounded-xl border p-4 transition-colors ${
                      v.isDefault ? "border-pink-300 bg-pink-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Preview da imagem da variação */}
                      <div className="relative shrink-0">
                        <div className="h-16 w-16 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                          {v.imageUrl ? (
                            <img src={v.imageUrl} alt={v.value} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-gray-300 text-center leading-tight p-1">
                              Sem foto
                            </div>
                          )}
                        </div>
                        <label className="absolute -bottom-1 -right-1 cursor-pointer">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-white shadow text-xs">
                            {v._uploading ? "…" : "↑"}
                          </div>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={v._uploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadVariationImage(v._key, file);
                            }}
                          />
                        </label>
                      </div>

                      {/* Campos da variação */}
                      <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Tipo</label>
                          <input
                            value={v.name}
                            onChange={(e) => updateVariation(v._key, "name", e.target.value)}
                            placeholder="Cor, Tamanho..."
                            className="input-field py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Valor *</label>
                          <input
                            value={v.value}
                            onChange={(e) => updateVariation(v._key, "value", e.target.value)}
                            placeholder="Vermelho, P, M..."
                            className="input-field py-1.5 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Estoque</label>
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => updateVariation(v._key, "stock", e.target.value)}
                            className="input-field py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Acréscimo R$</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.priceModifier}
                            onChange={(e) => updateVariation(v._key, "priceModifier", e.target.value)}
                            className="input-field py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">SKU da variação</label>
                          <input
                            value={v.sku}
                            onChange={(e) => updateVariation(v._key, "sku", e.target.value)}
                            placeholder="Opcional"
                            className="input-field py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-500">Ordem</label>
                          <input
                            type="number"
                            min="0"
                            value={v.order}
                            onChange={(e) => updateVariation(v._key, "order", e.target.value)}
                            className="input-field py-1.5 text-sm"
                          />
                        </div>
                        <div className="flex items-end gap-4 col-span-2">
                          <label className="flex cursor-pointer items-center gap-2 pb-1">
                            <input
                              type="checkbox"
                              checked={v.isDefault}
                              onChange={(e) => updateVariation(v._key, "isDefault", e.target.checked)}
                              className="h-4 w-4 accent-pink-500"
                            />
                            <span className="text-xs font-medium text-gray-600">Padrão</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 pb-1">
                            <input
                              type="checkbox"
                              checked={v.active}
                              onChange={(e) => updateVariation(v._key, "active", e.target.checked)}
                              className="h-4 w-4 accent-pink-500"
                            />
                            <span className="text-xs font-medium text-gray-600">Ativo</span>
                          </label>
                        </div>
                      </div>

                      {/* Remover */}
                      <button
                        type="button"
                        onClick={() => removeVariation(v._key)}
                        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="Remover variação"
                      >
                        ×
                      </button>
                    </div>

                    {v.isDefault && (
                      <p className="mt-2 text-xs text-pink-600 font-medium">
                        ★ Variação exibida por padrão no catálogo
                      </p>
                    )}
                    {parseInt(v.stock) === 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠ Sem estoque — aparecerá como indisponível para o cliente
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Estoque */}
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Estoque geral</h3>
              <p className="text-xs text-gray-400">
                {variations.length > 0
                  ? "Este produto tem variações. O estoque abaixo é o estoque base; o estoque real por cor está em cada variação acima."
                  : "Estoque total do produto."}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Estoque *</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required className="input-field" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Estoque mínimo</label>
                  <input name="minStock" type="number" min="0" value={form.minStock} onChange={handleChange} className="input-field" />
                </div>
              </div>
            </div>

            {/* Dimensões */}
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Dimensões e peso</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { name: "weight", label: "Peso (kg)", step: "0.001" },
                  { name: "height", label: "Altura (cm)", step: "0.1" },
                  { name: "width", label: "Largura (cm)", step: "0.1" },
                  { name: "length", label: "Comprimento (cm)", step: "0.1" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{field.label}</label>
                    <input
                      name={field.name}
                      type="number"
                      step={field.step}
                      min="0"
                      value={form[field.name as keyof FormState] as string}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-5">
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Organização</h3>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Categoria *</label>
                <select name="categoryId" value={form.categoryId} onChange={handleChange} required className="input-field">
                  <option value="">Selecione</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {subcategories.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Subcategoria</label>
                  <select name="subcategoryId" value={form.subcategoryId} onChange={handleChange} className="input-field">
                    <option value="">Sem subcategoria</option>
                    {subcategories.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-3">
                {[
                  { name: "active", label: "Produto ativo" },
                  { name: "featured", label: "Destaque na home" },
                  { name: "isNew", label: "Marcar como novidade" },
                ].map((opt) => (
                  <label key={opt.name} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name={opt.name}
                      checked={form[opt.name as keyof FormState] as boolean}
                      onChange={handleChange}
                      className="h-4 w-4 accent-pink-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="mb-4 font-semibold text-gray-900">Prévia</h3>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                <div className="aspect-square bg-pink-50">
                  {images[0] ? (
                    <img src={images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-pink-300">KA Bijoux</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm font-semibold text-gray-800">{form.name || "Nome do produto"}</p>
                  {variations.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {variations.slice(0, 5).map((v) => (
                        <span key={v._key} className="text-xs text-pink-500 bg-pink-50 rounded-full px-2 py-0.5">
                          {v.value || "—"}
                        </span>
                      ))}
                      {variations.length > 5 && (
                        <span className="text-xs text-gray-400">+{variations.length - 5}</span>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-base font-black text-pink-500">
                    {form.price ? Number(form.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button type="submit" disabled={loading || uploading} className="btn-primary w-full">
                {loading ? "Salvando..." : "Salvar alterações"}
              </button>
              <button type="button" onClick={() => router.back()} className="btn-ghost w-full">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function TechnicalTextarea({
  name, label, value, onChange,
}: {
  name: string; label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <textarea name={name} value={value} onChange={onChange} rows={3} className="input-field resize-y" />
    </div>
  );
}
