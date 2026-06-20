"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/admin/Header";
import { PRICE_PRESETS } from "@/lib/catalog";

interface Category {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
}

const emptyForm = {
  name: "",
  sku: "",
  brand: "",
  ean: "",
  description: "",
  benefits: "",
  howToUse: "",
  composition: "",
  careInstructions: "",
  packageContents: "",
  price: "",
  promotionalPrice: "",
  stock: "1",
  minStock: "5",
  weight: "0.15",
  height: "5",
  width: "10",
  length: "15",
  categoryId: "",
  subcategoryId: "",
  featured: false,
  isNew: true,
  active: true,
  variationName: "",
  variationValue: "",
  variationStock: "0",
  variationPriceModifier: "0",
};

export default function NovoProdutoPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saveAndNew, setSaveAndNew] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId) ?? null,
    [categories, form.categoryId]
  );
  const subcategories = selectedCategory?.children ?? [];

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((json) => setCategories(json.data ?? []));
  }, []);

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (event.target as HTMLInputElement).checked : value,
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
      setImages((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagens.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const shouldCreateAnother = submitter?.dataset.mode === "new";
    setLoading(true);
    setError("");

    try {
      const variations = form.variationName && form.variationValue
        ? [{
            name: form.variationName,
            value: form.variationValue,
            stock: parseInt(form.variationStock || "0"),
            priceModifier: parseFloat(form.variationPriceModifier || "0"),
            active: true,
          }]
        : [];

      const res = await fetch("/api/products", {
        method: "POST",
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
          categoryId: form.categoryId,
          subcategoryId: form.subcategoryId || null,
          featured: form.featured,
          isNew: form.isNew,
          active: form.active,
          images: images.map((url, index) => ({ url, order: index, alt: form.name })),
          variations,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erro ao salvar.");
        return;
      }

      if (shouldCreateAnother) {
        setForm((current) => ({
          ...emptyForm,
          categoryId: current.categoryId,
          subcategoryId: current.subcategoryId,
          stock: current.stock,
          minStock: current.minStock,
        }));
        setImages([]);
        setSaveAndNew(false);
        return;
      }

      router.push("/admin/produtos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header title="Novo Produto" subtitle="Cadastro rapido preparado para os produtos reais da KA Bijoux" />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Informacoes principais</h3>

              <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome do produto *</label>
                  <input name="name" value={form.name} onChange={handleChange} required placeholder="Ex: Brinco delicado" className="input-field" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">SKU opcional</label>
                  <input name="sku" value={form.sku} onChange={handleChange} placeholder="KA-001" className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Marca/Fabricante</label>
                  <input name="brand" value={form.brand} onChange={handleChange} placeholder="Ex: Intt" className="input-field" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">EAN/Código de barras</label>
                  <input name="ean" value={form.ean} onChange={handleChange} placeholder="Código do fornecedor" className="input-field" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Descrição completa *</label>
                <textarea name="description" value={form.description} onChange={handleChange} required rows={6} placeholder="Explique o produto, função e diferenciais sem inventar informações técnicas." className="input-field resize-y" />
              </div>
            </div>

            <div className="card space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Ficha técnica e orientações</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">Deixe vazio quando o fabricante não informar. A loja mostrará o campo como pendente de revisão.</p>
              </div>

              <TechnicalTextarea name="benefits" label="Benefícios" value={form.benefits} onChange={handleChange} placeholder="Principais benefícios comerciais confirmados." />
              <TechnicalTextarea name="composition" label="Material ou composição" value={form.composition} onChange={handleChange} placeholder="Somente dados confirmados na embalagem ou fabricante." />
              <TechnicalTextarea name="howToUse" label="Modo de uso" value={form.howToUse} onChange={handleChange} placeholder="Orientações simples e seguras de uso." />
              <TechnicalTextarea name="careInstructions" label="Cuidados e recomendações" value={form.careInstructions} onChange={handleChange} placeholder="Cuidados, restrições e forma de conservação." />
              <TechnicalTextarea name="packageContents" label="Conteúdo da embalagem" value={form.packageContents} onChange={handleChange} placeholder="Ex: 1 unidade do produto." />
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Preco</h3>
              <div className="flex flex-wrap gap-2">
                {PRICE_PRESETS.map((price) => (
                  <button
                    key={price}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, price: String(price) }))}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      form.price === String(price) ? "bg-pink-500 text-white" : "bg-pink-50 text-pink-500 hover:bg-pink-100"
                    }`}
                  >
                    R${price}
                  </button>
                ))}
                <button type="button" onClick={() => setForm((current) => ({ ...current, price: "" }))} className="rounded-full border border-pink-100 px-4 py-2 text-sm font-bold text-gray-500">
                  Outro valor
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Preco manual (R$) *</label>
                  <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required placeholder="0,00" className="input-field" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Preco promocional (R$)</label>
                  <input name="promotionalPrice" type="number" step="0.01" min="0" value={form.promotionalPrice} onChange={handleChange} placeholder="0,00" className="input-field" />
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Imagens</h3>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => uploadImages(event.target.files)}
                className="input-field"
              />
              <p className="text-xs text-gray-400">{uploading ? "Enviando imagens..." : "Selecione varias fotos para a galeria do produto."}</p>
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {images.map((url, index) => (
                    <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-pink-50">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-pink-500 shadow"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Estoque e variacao opcional</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Estoque *</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required className="input-field" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Estoque minimo</label>
                  <input name="minStock" type="number" min="0" value={form.minStock} onChange={handleChange} className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input name="variationName" value={form.variationName} onChange={handleChange} placeholder="Variacao: Cor" className="input-field" />
                <input name="variationValue" value={form.variationValue} onChange={handleChange} placeholder="Valor: Rosa" className="input-field" />
                <input name="variationStock" type="number" min="0" value={form.variationStock} onChange={handleChange} placeholder="Estoque da variacao" className="input-field" />
                <input name="variationPriceModifier" type="number" step="0.01" value={form.variationPriceModifier} onChange={handleChange} placeholder="Acrescimo R$" className="input-field" />
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Dimensoes e peso</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { name: "weight", label: "Peso (kg)", step: "0.001" },
                  { name: "height", label: "Altura (cm)", step: "0.1" },
                  { name: "width", label: "Largura (cm)", step: "0.1" },
                  { name: "length", label: "Comprimento (cm)", step: "0.1" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">{field.label}</label>
                    <input name={field.name} type="number" step={field.step} min="0" value={form[field.name as keyof typeof form] as string} onChange={handleChange} className="input-field" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Organizacao</h3>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Categoria *</label>
                <select name="categoryId" value={form.categoryId} onChange={handleChange} required className="input-field">
                  <option value="">Selecione</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              {subcategories.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Subcategoria</label>
                  <select name="subcategoryId" value={form.subcategoryId} onChange={handleChange} className="input-field">
                    <option value="">Sem subcategoria</option>
                    {subcategories.map((subcategory) => (
                      <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
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
                      checked={form[opt.name as keyof typeof form] as boolean}
                      onChange={handleChange}
                      className="h-4 w-4 accent-pink-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="mb-4 font-semibold text-gray-900">Previa do card</h3>
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
                  <p className="mt-2 text-base font-black text-pink-500">
                    {form.price ? Number(form.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button type="submit" data-mode="done" disabled={loading || uploading} onClick={() => setSaveAndNew(false)} className="btn-primary w-full">
                {loading && !saveAndNew ? "Salvando..." : "Salvar"}
              </button>
              <button type="submit" data-mode="new" disabled={loading || uploading} onClick={() => setSaveAndNew(true)} className="rounded-xl border-2 border-pink-500 px-5 py-2.5 font-semibold text-pink-500 transition-colors hover:bg-pink-50">
                {loading && saveAndNew ? "Salvando..." : "Salvar e cadastrar outro"}
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
  name,
  label,
  value,
  placeholder,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={4}
        placeholder={placeholder}
        className="input-field resize-y"
      />
    </div>
  );
}
