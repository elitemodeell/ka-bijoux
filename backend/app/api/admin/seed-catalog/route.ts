export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureCatalogCategories } from "@/lib/catalog-db";
import { STATIC_SEX_SHOP_CATALOG } from "@/lib/static-sex-shop-catalog";

const BIJOUX_PRODUCTS = [
  {
    slug: "brinco-delicado",
    name: "Brinco delicado",
    description: "Brinco feminino leve, delicado e perfeito para o dia a dia. Acabamento cuidadoso e design que combina com qualquer look.",
    price: 12,
    image: "/imagens/foto-03.jpeg",
    catSlug: "bijuterias",
    featured: true,
    isNew: true,
  },
  {
    slug: "colar-feminino",
    name: "Colar feminino",
    description: "Colar feminino com acabamento bonito para compor produções delicadas. Elegante e versátil para o dia a dia.",
    price: 24,
    image: "/imagens/foto-06.jpeg",
    catSlug: "bijuterias",
    featured: true,
    isNew: false,
  },
  {
    slug: "capinha-feminina",
    name: "Capinha feminina",
    description: "Capinha charmosa para proteger o celular com personalidade. Design feminino com proteção completa.",
    price: 27,
    image: "/imagens/produto-01.jpg",
    catSlug: "capinhas-acessorios-celular",
    featured: true,
    isNew: true,
  },
  {
    slug: "camisola-lingerie",
    name: "Camisola/Lingerie",
    description: "Peça delicada para uma linha íntima feminina, discreta e elegante. Tecido macio e confortável.",
    price: 36,
    image: "/imagens/foto-12.jpeg",
    catSlug: "lingerie",
    featured: true,
    isNew: false,
  },
  {
    slug: "oculos-de-sol",
    name: "Óculos de sol",
    description: "Óculos de sol moderno para completar o look com estilo. Proteção UV e design atual.",
    price: 47,
    image: "/imagens/foto-08.jpeg",
    catSlug: "oculos",
    featured: true,
    isNew: false,
  },
  {
    slug: "necessaire-rosa",
    name: "Necessaire rosa",
    description: "Necessaire rosa prática, bonita e perfeita para organizar acessórios, joias e muito mais.",
    price: 48,
    image: "/imagens/foto-05.jpeg",
    catSlug: "bolsas-necessaires",
    featured: true,
    isNew: false,
  },
];

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "ka-seed-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureCatalogCategories(prisma);

  const allCategories = await prisma.category.findMany();
  const catMap = new Map(allCategories.map((c) => [c.slug, c.id]));

  const results = { seeded: 0, updated: 0, errors: [] as string[] };

  const sexShopCatId = catMap.get("sex-shop");
  if (!sexShopCatId) {
    return NextResponse.json({ error: "Categoria sex-shop nao encontrada. Verifique o banco." }, { status: 500 });
  }

  // ── Sex shop catalog (77 produtos com imagens em /uploads/products/) ──
  for (const product of Array.from(STATIC_SEX_SHOP_CATALOG.values())) {
    const subcatId = catMap.get(product.subcategorySlug) ?? null;
    const imageUrl = `/uploads/products/${product.imageFile}`;
    const description = [product.longDescription, product.shortDescription]
      .map((t) => t?.trim())
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 2000);

    try {
      const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
      if (existing) {
        await prisma.product.update({
          where: { slug: product.slug },
          data: {
            price: product.price,
            stock: product.stock,
            active: true,
            publicationStatus: "PUBLISHED",
          },
        });
        results.updated++;
      } else {
        const created = await prisma.product.create({
          data: {
            slug: product.slug,
            name: product.name,
            description,
            price: product.price,
            stock: product.stock,
            sku: product.sku ?? null,
            active: true,
            featured: false,
            isNew: false,
            publicationStatus: "PUBLISHED",
            importSource: "MANUAL",
            enrichmentStatus: "NOT_REQUIRED",
            categoryId: sexShopCatId,
            subcategoryId: subcatId,
          },
        });
        await prisma.productImage.create({
          data: { productId: created.id, url: imageUrl, alt: product.name, order: 0 },
        });
        results.seeded++;
      }
    } catch (err) {
      results.errors.push(`${product.slug}: ${String(err).slice(0, 120)}`);
    }
  }

  // ── Bijoux / moda mock products ──
  for (const mock of BIJOUX_PRODUCTS) {
    const catId = catMap.get(mock.catSlug);
    if (!catId) {
      results.errors.push(`Categoria nao encontrada: ${mock.catSlug}`);
      continue;
    }

    try {
      const existing = await prisma.product.findUnique({ where: { slug: mock.slug } });
      if (existing) {
        await prisma.product.update({
          where: { slug: mock.slug },
          data: {
            price: mock.price,
            active: true,
            featured: mock.featured,
            publicationStatus: "PUBLISHED",
          },
        });
        results.updated++;
      } else {
        const created = await prisma.product.create({
          data: {
            slug: mock.slug,
            name: mock.name,
            description: mock.description,
            price: mock.price,
            stock: 30,
            active: true,
            featured: mock.featured,
            isNew: mock.isNew,
            publicationStatus: "PUBLISHED",
            importSource: "MANUAL",
            enrichmentStatus: "NOT_REQUIRED",
            categoryId: catId,
          },
        });
        await prisma.productImage.create({
          data: { productId: created.id, url: mock.image, alt: mock.name, order: 0 },
        });
        results.seeded++;
      }
    } catch (err) {
      results.errors.push(`${mock.slug}: ${String(err).slice(0, 120)}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: `${results.seeded} produtos criados, ${results.updated} atualizados.`,
    ...results,
  });
}
