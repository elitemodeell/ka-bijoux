"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  children: Array<{ id: string; name: string; slug: string }>;
};

type BlingProductActionItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  subcategoryId: string | null;
  publicationStatus: string;
};

type Props = {
  product: BlingProductActionItem;
  categories: CategoryOption[];
};

export default function BlingProductsActions({ product, categories }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: product.name,
    price: String(product.price),
    description: product.description,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId ?? "",
  });

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId) ?? null,
    [categories, form.categoryId]
  );

  async function patchProduct(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setError("");
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Erro ao atualizar produto.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar produto.");
    } finally {
      setBusy("");
    }
  }

  async function approve() {
    await patchProduct(
      {
        active: true,
        publicationStatus: "PUBLISHED",
        enrichmentStatus: "MANUAL_REVIEWED",
      },
      "approve"
    );
  }

  async function hide() {
    await patchProduct(
      {
        active: false,
        publicationStatus: "HIDDEN",
      },
      "hide"
    );
  }

  async function saveEditor(event: React.FormEvent) {
    event.preventDefault();
    const price = Number(String(form.price).replace(",", "."));
    if (!Number.isFinite(price) || price <= 0) {
      setError("Informe um preco valido.");
      return;
    }

    await patchProduct(
      {
        name: form.name,
        price,
        description: form.description,
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || null,
        publicationStatus:
          product.publicationStatus === "MISSING_DESCRIPTION"
            ? "PENDING_REVIEW"
            : product.publicationStatus,
      },
      "save"
    );
  }

  async function reenrich() {
    setBusy("enrich");
    setError("");
    try {
      const res = await fetch("/api/admin/products/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [product.id] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Erro ao reenriquecer produto.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao reenriquecer produto.");
    } finally {
      setBusy("");
    }
  }

  async function uploadImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setBusy("image");
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const uploadRes = await fetch("/api/admin/products/upload", { method: "POST", body });
      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Erro ao enviar imagem.");

      const imageRes = await fetch(`/api/admin/products/${product.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploadJson.data.url, alt: product.name }),
      });
      const imageJson = await imageRes.json().catch(() => ({}));
      if (!imageRes.ok) throw new Error(imageJson.error ?? "Erro ao trocar imagem.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao trocar imagem.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={approve}
          disabled={Boolean(busy)}
          className="rounded-full bg-pink-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-pink-600 disabled:opacity-60"
        >
          {busy === "approve" ? "Aprovando..." : "Aprovar"}
        </button>
        <button
          type="button"
          onClick={hide}
          disabled={Boolean(busy)}
          className="rounded-full border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          {busy === "hide" ? "Ocultando..." : "Ocultar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full border border-pink-100 bg-pink-50 px-3 py-2 text-xs font-bold text-pink-600 transition-colors hover:bg-pink-100"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={reenrich}
          disabled={Boolean(busy)}
          className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-bold text-yellow-700 transition-colors hover:bg-yellow-100 disabled:opacity-60"
        >
          {busy === "enrich" ? "Pesquisando..." : "Reenriquecer"}
        </button>
        <label className="cursor-pointer rounded-full border border-pink-100 bg-white px-3 py-2 text-xs font-bold text-pink-600 transition-colors hover:bg-pink-50">
          {busy === "image" ? "Enviando..." : "Trocar imagem"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={Boolean(busy)}
            onChange={(event) => uploadImage(event.target.files)}
          />
        </label>
      </div>

      {error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}

      {open && (
        <form onSubmit={saveEditor} className="rounded-2xl border border-pink-100 bg-pink-50/55 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <label className="block text-xs font-bold text-gray-600">
              Nome
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
              />
            </label>
            <label className="block text-xs font-bold text-gray-600">
              Preco
              <input
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
              />
            </label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block text-xs font-bold text-gray-600">
              Categoria
              <select
                value={form.categoryId}
                onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value, subcategoryId: "" }))}
                className="mt-1 w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold text-gray-600">
              Subcategoria
              <select
                value={form.subcategoryId}
                onChange={(event) => setForm((current) => ({ ...current, subcategoryId: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
              >
                <option value="">Sem subcategoria</option>
                {selectedCategory?.children.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block text-xs font-bold text-gray-600">
            Descricao
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              className="mt-1 w-full resize-none rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:border-pink-300"
            />
          </label>

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={Boolean(busy)}
              className="rounded-full bg-gray-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-pink-600 disabled:opacity-60"
            >
              {busy === "save" ? "Salvando..." : "Salvar edicao"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
