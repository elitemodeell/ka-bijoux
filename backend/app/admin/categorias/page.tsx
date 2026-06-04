"use client";

import { useEffect, useState } from "react";
import Header from "@/components/admin/Header";

interface Category {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  order: number;
  children?: Category[];
  _count?: { products: number; subcategoryProducts?: number };
}

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", parentId: "", order: "0", active: true });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function fetchCategories() {
    const res = await fetch("/api/categories");
    const json = await res.json();
    setCategories(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, parentId: form.parentId || null, order: parseInt(form.order), active: form.active }),
    });
    setForm({ name: "", parentId: "", order: "0", active: true });
    setShowForm(false);
    await fetchCategories();
    setCreating(false);
  }

  return (
    <div>
      <Header
        title="Categorias"
        subtitle={`${categories.length} categorias`}
        action={
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? "Cancelar" : "+ Nova Categoria"}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="card mb-5">
          <h3 className="font-semibold text-gray-900 mb-4">Nova Categoria</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
              <input
                value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required placeholder="Ex: Bijuterias" className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria pai</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
                className="input-field"
              >
                <option value="">Categoria principal</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ordem</label>
              <input
                type="number" value={form.order}
                onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                className="w-4 h-4 accent-pink-500"
              />
              <span className="text-sm text-gray-700">Categoria ativa</span>
            </label>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Nome</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Slug</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Produtos</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Ordem</th>
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900">
                  <p>{cat.name}</p>
                  {cat.children?.length ? (
                    <p className="mt-1 text-xs font-normal text-pink-500">
                      Subcategorias: {cat.children.map((child) => child.name).join(", ")}
                    </p>
                  ) : null}
                </td>
                <td className="py-3 px-4 text-gray-400 font-mono text-xs">{cat.slug}</td>
                <td className="py-3 px-4 text-gray-600">{cat._count?.products ?? 0}</td>
                <td className="py-3 px-4 text-gray-600">{cat.order}</td>
                <td className="py-3 px-4">
                  <span className={`badge-status ${cat.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {cat.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="py-10 text-center text-gray-400">Carregando...</div>}
      </div>
    </div>
  );
}
