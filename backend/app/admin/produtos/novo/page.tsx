"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/admin/Header";

interface Category { id: string; name: string }

export default function NovoProdutoPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", description: "", price: "", promotionalPrice: "",
    stock: "0", minStock: "5", weight: "0.3",
    height: "5", width: "10", length: "15",
    categoryId: "", featured: false, isNew: true, active: true,
  });

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.data ?? []));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          promotionalPrice: form.promotionalPrice ? parseFloat(form.promotionalPrice) : null,
          stock: parseInt(form.stock),
          minStock: parseInt(form.minStock),
          weight: parseFloat(form.weight),
          height: parseFloat(form.height),
          width: parseFloat(form.width),
          length: parseFloat(form.length),
          categoryId: form.categoryId,
          featured: form.featured,
          isNew: form.isNew,
          active: form.active,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao salvar."); return; }
      router.push("/admin/produtos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header title="Novo Produto" subtitle="Cadastrar produto na loja" />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Informações Básicas</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do produto *</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder="Ex: Colar Dourado Coração" className="input-field" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição *</label>
                <textarea name="description" value={form.description} onChange={handleChange} required rows={4} placeholder="Descreva o produto..." className="input-field resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Preço (R$) *</label>
                  <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} required placeholder="0,00" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Preço Promocional (R$)</label>
                  <input name="promotionalPrice" type="number" step="0.01" min="0" value={form.promotionalPrice} onChange={handleChange} placeholder="0,00" className="input-field" />
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Estoque</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantidade em Estoque *</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Estoque Mínimo (alerta)</label>
                  <input name="minStock" type="number" min="0" value={form.minStock} onChange={handleChange} className="input-field" />
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Dimensões e Peso (para cálculo de frete)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso (kg)</label>
                  <input name="weight" type="number" step="0.001" min="0" value={form.weight} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Altura (cm)</label>
                  <input name="height" type="number" step="0.1" min="0" value={form.height} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Largura (cm)</label>
                  <input name="width" type="number" step="0.1" min="0" value={form.width} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Comprimento (cm)</label>
                  <input name="length" type="number" step="0.1" min="0" value={form.length} onChange={handleChange} className="input-field" />
                </div>
              </div>
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-5">
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Organização</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria *</label>
                <select name="categoryId" value={form.categoryId} onChange={handleChange} required className="input-field">
                  <option value="">Selecione uma categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {[
                  { name: "active", label: "Produto ativo (visível na loja)" },
                  { name: "featured", label: "Produto em destaque" },
                  { name: "isNew", label: "Marcar como novidade" },
                ].map((opt) => (
                  <label key={opt.name} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name={opt.name}
                      checked={form[opt.name as keyof typeof form] as boolean}
                      onChange={handleChange}
                      className="w-4 h-4 accent-pink-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
