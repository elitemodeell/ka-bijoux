export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { ProductEnrichmentStatus, ProductImportSource, ProductPublicationStatus } from "@prisma/client";
import Header from "@/components/admin/Header";
import { prisma } from "@/lib/prisma";
import BlingProductsActions from "./BlingProductsActions";

const formatCurrency = (value: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));

const publicationLabels: Record<string, { label: string; className: string }> = {
  IMPORTED: { label: "importado", className: "bg-blue-50 text-blue-700" },
  PENDING_REVIEW: { label: "pendente_revisao", className: "bg-yellow-50 text-yellow-700" },
  APPROVED: { label: "aprovado", className: "bg-emerald-50 text-emerald-700" },
  PUBLISHED: { label: "publicado", className: "bg-green-50 text-green-700" },
  HIDDEN: { label: "oculto", className: "bg-gray-100 text-gray-500" },
  MISSING_IMAGE: { label: "sem_imagem", className: "bg-red-50 text-red-700" },
  MISSING_DESCRIPTION: { label: "sem_descricao", className: "bg-orange-50 text-orange-700" },
};

export default async function ProdutosBlingPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        OR: [
          { importSource: ProductImportSource.BLING },
          { blingId: { not: null } },
        ],
      },
      include: {
        category: true,
        subcategory: true,
        images: { orderBy: { order: "asc" }, take: 1 },
      },
      orderBy: [{ publicationStatus: "asc" }, { createdAt: "desc" }],
      take: 400,
    }),
    prisma.category.findMany({
      where: { parentId: null, active: true },
      include: { children: { where: { active: true }, orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    }),
  ]);

  const stats = {
    imported: products.length,
    missingImage: products.filter((product) => product.images.length === 0 || product.publicationStatus === ProductPublicationStatus.MISSING_IMAGE).length,
    missingDescription: products.filter((product) => !hasRealDescription(product.description) || product.publicationStatus === ProductPublicationStatus.MISSING_DESCRIPTION).length,
    pendingReview: products.filter((product) =>
      product.enrichmentStatus === ProductEnrichmentStatus.NEEDS_MANUAL_REVIEW ||
      product.publicationStatus === ProductPublicationStatus.PENDING_REVIEW ||
      product.publicationStatus === ProductPublicationStatus.MISSING_IMAGE ||
      product.publicationStatus === ProductPublicationStatus.MISSING_DESCRIPTION
    ).length,
    published: products.filter((product) => product.active && product.publicationStatus === ProductPublicationStatus.PUBLISHED).length,
    hidden: products.filter((product) => !product.active || product.publicationStatus === ProductPublicationStatus.HIDDEN).length,
  };

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    children: category.children.map((child) => ({ id: child.id, name: child.name, slug: child.slug })),
  }));

  return (
    <div>
      <Header
        title="Produtos Bling"
        subtitle="Revisao dos produtos reais importados para a KA Bijoux"
        action={
          <Link href="/admin/produtos" className="rounded-xl border border-pink-100 bg-white px-4 py-2 text-sm font-bold text-pink-600 shadow-sm transition-colors hover:bg-pink-50">
            Ver todos
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Stat label="Importados" value={stats.imported} />
        <Stat label="Sem imagem" value={stats.missingImage} tone="red" />
        <Stat label="Sem descricao" value={stats.missingDescription} tone="orange" />
        <Stat label="Pendentes" value={stats.pendingReview} tone="yellow" />
        <Stat label="Publicados" value={stats.published} tone="green" />
        <Stat label="Ocultos" value={stats.hidden} />
      </div>

      <div className="mt-6 overflow-hidden rounded-[26px] border border-pink-100 bg-white shadow-[0_18px_44px_rgba(236,72,153,0.08)]">
        <div className="border-b border-pink-50 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">Fila operacional</p>
          <h2 className="mt-1 text-lg font-black text-gray-950">Produtos importados da Bling</h2>
        </div>

        <div className="divide-y divide-pink-50">
          {products.map((product) => {
            const image = product.images[0]?.url;
            const status = publicationLabels[product.publicationStatus] ?? publicationLabels.IMPORTED;

            return (
              <article key={product.id} className="grid gap-4 px-4 py-5 lg:grid-cols-[88px_minmax(0,1fr)_320px] lg:px-5">
                <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-pink-50 bg-pink-50 lg:h-[88px] lg:w-[88px]">
                  {image ? (
                    <Image src={image} alt={product.name} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-black text-pink-300">
                      KA
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${status.className}`}>
                      {status.label}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${product.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {product.active ? "ativo" : "inativo"}
                    </span>
                  </div>

                  <h3 className="mt-2 line-clamp-2 text-base font-black text-gray-950">{product.name}</h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-gray-500">
                    <span>Bling: {product.blingId || "nao informado"}</span>
                    <span>SKU: {product.sku || "sem SKU"}</span>
                    <span>Estoque: {product.stock}</span>
                    <span>{product.category.name}{product.subcategory ? ` / ${product.subcategory.name}` : ""}</span>
                  </div>

                  <p className="mt-2 text-xl font-black text-pink-500">{formatCurrency(product.promotionalPrice ?? product.price)}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-500">
                    {hasRealDescription(product.description)
                      ? product.description
                      : "Descricao pendente de revisao. Nao ha informacao tecnica confiavel suficiente para preencher automaticamente."}
                  </p>
                </div>

                <BlingProductsActions
                  product={{
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    price: Number(product.price),
                    categoryId: product.categoryId,
                    subcategoryId: product.subcategoryId,
                    publicationStatus: product.publicationStatus,
                  }}
                  categories={categoryOptions}
                />
              </article>
            );
          })}
        </div>

        {products.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-lg font-black text-gray-950">Nenhum produto Bling encontrado.</p>
            <p className="mt-2 text-sm text-gray-500">
              Rode o importador da Bling para preencher esta fila com os produtos reais da KA Bijoux.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "pink" }: { label: string; value: number; tone?: "pink" | "red" | "orange" | "yellow" | "green" }) {
  const tones = {
    pink: "bg-pink-50 text-pink-600",
    red: "bg-red-50 text-red-600",
    orange: "bg-orange-50 text-orange-600",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-green-50 text-green-700",
  };

  return (
    <div className={`rounded-2xl px-4 py-4 ${tones[tone]}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] opacity-75">{label}</p>
    </div>
  );
}

function hasRealDescription(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    value.trim().length >= 80 &&
    !normalized.includes("informacoes tecnicas aguardam revisao") &&
    !normalized.includes("produto ka bijoux importado da bling")
  );
}
