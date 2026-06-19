import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_SLUG = "sex-shop";

const SUBCATEGORIES = [
  { slug: "sex-shop-geis-e-cremes",    name: "Géis & Cremes",       pathSlug: "geis-e-cremes",       description: "Géis de massagem corporal, cremes estimulantes e produtos sensoriais.", order: 1 },
  { slug: "sex-shop-vibradores",       name: "Vibradores",          pathSlug: "vibradores",          description: "Vibradores, bullets e controles vibratórios.", order: 2 },
  { slug: "sex-shop-aneis",            name: "Anéis Penianos",      pathSlug: "aneis-penianos",      description: "Anéis penianos em diversas cores e modelos.", order: 3 },
  { slug: "sex-shop-masturbadores",    name: "Masturbadores",       pathSlug: "masturbadores",       description: "Masturbadores EGG e mini bullets.", order: 4 },
  { slug: "sex-shop-lubrificantes",    name: "Lubrificantes",       pathSlug: "lubrificantes",       description: "Géis lubrificantes e umectantes íntimos.", order: 5 },
  { slug: "sex-shop-balas-liquidas",   name: "Balas Líquidas",      pathSlug: "balas-liquidas",      description: "Balas líquidas e estimulantes orais.", order: 6 },
  { slug: "sex-shop-desodorantes",     name: "Desodorantes Íntimos",pathSlug: "desodorantes-intimos",description: "Desodorantes íntimos com fragrâncias suaves.", order: 7 },
];

const PRODUCTS: Array<{
  slug: string;
  name: string;
  description: string;
  price: number;
  sku: string | null;
  stock: number;
  subcategorySlug: string;
  imageFile: string;
  featured?: boolean;
  isNew?: boolean;
}> = [
  // Géis & Cremes
  {
    slug: "creme-adstringente-sexy",
    name: "Creme Adstringente Sexy — Close Love 15g",
    description: "Creme adstringente sensual para massagem e prazer. Embalagem discreta.",
    price: 12,
    sku: "3104000004693",
    stock: 2,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "close-love-15g.png",
  },
  {
    slug: "k-med-gel-intimo",
    name: "K-Med Gel Íntimo",
    description: "Gel íntimo lubrificante com fórmula suave e compatível com preservativos.",
    price: 17,
    sku: "3104000004698",
    stock: 8,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "k-med-gel-intimo.png",
    isNew: true,
  },
  {
    slug: "vamos-ser-feliz-gel",
    name: "Vamos Ser Feliz Gel",
    description: "Gel estimulante com aroma agradável para momentos especiais a dois.",
    price: 12,
    sku: "3104000004713",
    stock: 6,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "vamos-ser-feliz-gel.png",
  },
  {
    slug: "rivosex-gel",
    name: "Rivosex Gel",
    description: "Gel estimulante de absorção rápida, fórmula exclusiva.",
    price: 12,
    sku: "3104000004704",
    stock: 8,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "rivosex-gel.png",
  },
  {
    slug: "pererecard-gel",
    name: "Pererecard Gel",
    description: "Gel estimulante com efeito intenso e embalagem discreta.",
    price: 12,
    sku: "3104000004714",
    stock: 6,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "pererecard-gel.png",
  },
  {
    slug: "pirocadura-gel",
    name: "Pirocadura Gel",
    description: "Gel estimulante com efeito aquecimento suave.",
    price: 12,
    sku: "3104000004709",
    stock: 3,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "pirocadura-gel.png",
  },
  {
    slug: "beijo-grego-gel",
    name: "Beijo Grego Gel",
    description: "Gel lubrificante íntimo para casais, fórmula suave.",
    price: 12,
    sku: "3104000004707",
    stock: 4,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "beijo-grego-gel.png",
  },
  {
    slug: "paracetaduro-gel",
    name: "Paracetaduro Sexy Gel",
    description: "Gel estimulante com embalagem divertida e discreta.",
    price: 12,
    sku: "3104000004711",
    stock: 4,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "paracetaduro-gel.png",
  },
  {
    slug: "pirocaxona-gel",
    name: "Pirocaxona Gel",
    description: "Gel estimulante de efeito rápido, embalagem compacta.",
    price: 12,
    sku: "3104000004710",
    stock: 2,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "pirocaexana-gel.png",
  },
  {
    slug: "jonumete-gel",
    name: "Jonumete Gel",
    description: "Gel estimulante com aroma exclusivo, ação prolongada.",
    price: 12,
    sku: "3104000004708",
    stock: 4,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "janumete-gel.png",
  },
  {
    slug: "anis-sex-gel",
    name: "Anis Sex Gel",
    description: "Gel aromático com fragrância de anis para massagem sensual.",
    price: 12,
    sku: "3104000004706",
    stock: 10,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "anis-sex-gel.png",
  },
  {
    slug: "fofatoba-gel",
    name: "Fofatoba Gel",
    description: "Gel estimulante com embalagem divertida e resultados intensos.",
    price: 12,
    sku: "3104000004712",
    stock: 8,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "fofatoba-gel.png",
  },
  {
    slug: "kama-sutra-gel",
    name: "Kama Sutra Gel",
    description: "Gel lubrificante inspirado no clássico Kama Sutra, suave e hidratante.",
    price: 12,
    sku: "3104000004703",
    stock: 11,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "kama-sutra-gel.png",
    featured: true,
  },
  {
    slug: "hot-ice-gel",
    name: "Hot Ice Gel",
    description: "Gel duplo efeito — quente e frio — para estimulação intensa.",
    price: 12,
    sku: "3104000004719",
    stock: 3,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "hot-ice-gel.png",
    isNew: true,
  },
  {
    slug: "anosex-gel",
    name: "Anosex Gel",
    description: "Gel anestésico íntimo de ação rápida e suave.",
    price: 12,
    sku: "3104000004726",
    stock: 1,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "amoxsex-gel.png",
  },
  {
    slug: "virginite-gel",
    name: "Virginite Gel",
    description: "Gel adstringente com efeito refirmante e hidratante.",
    price: 12,
    sku: "3104000004727",
    stock: 2,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "virginite-gel.png",
  },
  {
    slug: "sempre-virgem-gel",
    name: "Sempre Virgem Gel",
    description: "Gel adstringente íntimo, sensação de revigoramento.",
    price: 12,
    sku: "3104000004718",
    stock: 3,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "sempre-virgem-gel.png",
  },
  {
    slug: "metioulate-gel",
    name: "Metioulate Gel",
    description: "Gel estimulante com fórmula especial de ação prolongada.",
    price: 12,
    sku: "3104000004705",
    stock: 4,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "metioulate-gel.png",
  },
  {
    slug: "lone-anel-gel",
    name: "Lone Anel Gel",
    description: "Gel lubrificante íntimo para uso pessoal ou a dois.",
    price: 12,
    sku: "3104000004722",
    stock: 3,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "come-anel-gel.png",
  },
  {
    slug: "mete-ficha-gel",
    name: "Mete Ficha Gel",
    description: "Gel estimulante com embalagem divertida, efeito imediato.",
    price: 12,
    sku: "3104000004715",
    stock: 2,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "mete-ficha-gel.png",
  },
  {
    slug: "dando-uma-gostoso-gel",
    name: "Dando uma Gostoso Gel",
    description: "Gel íntimo com sensação de prazer prolongado.",
    price: 12,
    sku: "3104000004723",
    stock: 3,
    subcategorySlug: "sex-shop-geis-e-cremes",
    imageFile: "dando-uma-gostoso-gel.png",
  },

  // Vibradores
  {
    slug: "vibrador-sexy-controle-rosa",
    name: "Vibrador Sexy com Controle Rosa",
    description: "Vibrador com controle remoto, diversas velocidades e cores disponíveis.",
    price: 12,
    sku: "3104000004755",
    stock: 4,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "vibrador-sexy-controle-cores.png",
    isNew: true,
  },
  {
    slug: "vibrador-golfinho-rosa",
    name: "Vibrador Golfinho Rosa",
    description: "Vibrador em formato golfinho com estimulação dupla.",
    price: 12,
    sku: "3104000004751",
    stock: 1,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "vibrador-golfinho-rosa.png",
    featured: true,
  },
  {
    slug: "mini-bullet-rosa-ponta-fina",
    name: "Mini Bullet Duplo Rosa Ponta Fina",
    description: "Mini vibrador bullet com ponta fina para estimulação precisa.",
    price: 24,
    sku: "3104000004760",
    stock: 12,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "mini-bullet-rosa-ponta-fina.png",
    featured: true,
    isNew: true,
  },
  {
    slug: "mini-bullet-duplo-linguinha",
    name: "Mini Bullet Duplo Linguinha Roxo",
    description: "Mini vibrador duplo em formato de linguinha, intensidade ajustável.",
    price: 24,
    sku: "3104000004758",
    stock: 11,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "mini-bullet-duplo-linguinha.png",
    isNew: true,
  },
  {
    slug: "mini-bullet-duplo-rosa",
    name: "Mini Bullet Duplo Vibrador Rosa",
    description: "Mini vibrador duplo rosa com múltiplas velocidades de estimulação.",
    price: 24,
    sku: "3104000004759",
    stock: 13,
    subcategorySlug: "sex-shop-vibradores",
    imageFile: "mini-bullet-duplo-rosa.png",
    isNew: true,
  },

  // Anéis Penianos
  {
    slug: "anel-peniano-bolinha-cores",
    name: "Anel Peniano Sexy Bolinha Transparente",
    description: "Anel peniano com bolinhas estimulantes, disponível em diversas cores.",
    price: 12,
    sku: "3104000004747",
    stock: 2,
    subcategorySlug: "sex-shop-aneis",
    imageFile: "anel-peniano-bolinha-cores.png",
  },
  {
    slug: "anel-peniano-orelha-roxo",
    name: "Anel Peniano Roxo de Orelha",
    description: "Anel peniano com formato orelha para estimulação extra, cor roxo.",
    price: 12,
    sku: "3104000004741",
    stock: 9,
    subcategorySlug: "sex-shop-aneis",
    imageFile: "anel-peniano-orelha-cores.png",
    featured: true,
  },
  {
    slug: "anel-peniano-orelha-rosa",
    name: "Anel Peniano Rosa de Orelha",
    description: "Anel peniano com formato orelha para estimulação extra, cor rosa.",
    price: 12,
    sku: "3104000004742",
    stock: 16,
    subcategorySlug: "sex-shop-aneis",
    imageFile: "anel-peniano-orelha-rosa-roxo.png",
    featured: true,
  },

  // Masturbadores
  {
    slug: "egg-silky",
    name: "EGG Silky",
    description: "Masturbador EGG textura silky suave para estimulação intensa.",
    price: 12,
    sku: null,
    stock: 5,
    subcategorySlug: "sex-shop-masturbadores",
    imageFile: "egg-silky.png",
  },
  {
    slug: "egg-stepper-rosa",
    name: "Masturbador EGG Stepper Rosa",
    description: "Masturbador EGG com textura stepper para prazer intenso.",
    price: 12,
    sku: "3104000004694",
    stock: 3,
    subcategorySlug: "sex-shop-masturbadores",
    imageFile: "egg-stepper.png",
  },
  {
    slug: "egg-twister-laranja",
    name: "Masturbador EGG Twister Laranja",
    description: "Masturbador EGG com textura twister, estimulação diferenciada.",
    price: 12,
    sku: "3104000000801",
    stock: 13,
    subcategorySlug: "sex-shop-masturbadores",
    imageFile: "egg-twister.png",
  },
  {
    slug: "egg-wavy-roxo",
    name: "Masturbador EGG Wavy Roxo",
    description: "Masturbador EGG com textura wavy, sensação de ondas.",
    price: 12,
    sku: "3104000004695",
    stock: 7,
    subcategorySlug: "sex-shop-masturbadores",
    imageFile: "egg-wavy.png",
  },

  // Lubrificantes
  {
    slug: "nabucetim-sex-18ml",
    name: "Nabucetim Sex 18ml",
    description: "Lubrificante íntimo base aquosa, suave e hidratante, 18ml.",
    price: 12,
    sku: "3104000001491",
    stock: 8,
    subcategorySlug: "sex-shop-lubrificantes",
    imageFile: "nabucetim-18ml.png",
  },
  {
    slug: "nocucedim-sex-18ml",
    name: "Nocucedim Sex 18ml",
    description: "Lubrificante íntimo de longa duração, base aquosa, 18ml.",
    price: 12,
    sku: "3104000001500",
    stock: 27,
    subcategorySlug: "sex-shop-lubrificantes",
    imageFile: "nocucedim-18ml.png",
    featured: true,
  },

  // Desodorantes Íntimos
  {
    slug: "desodorante-intimo-doce-paixao",
    name: "Desodorante Íntimo Doce Paixão",
    description: "Desodorante íntimo com fragrância doce e suave, frescor duradouro.",
    price: 17,
    sku: "3104000004310",
    stock: 20,
    subcategorySlug: "sex-shop-desodorantes",
    imageFile: "desodorante-intimo-doce-paixao.png",
    featured: true,
  },
  {
    slug: "desodorante-intimo-tutti-frutti",
    name: "Desodorante Íntimo Tutti Frutti",
    description: "Desodorante íntimo com fragrância tutti frutti, proteção e frescor.",
    price: 17,
    sku: "3104000004311",
    stock: 19,
    subcategorySlug: "sex-shop-desodorantes",
    imageFile: "desodorante-intimo-tutti-frutti.png",
    featured: true,
  },
  {
    slug: "desodorante-intimo-morango",
    name: "Desodorante Íntimo Morango",
    description: "Desodorante íntimo com fragrância de morango, leve e refrescante.",
    price: 17,
    sku: "3104000004313",
    stock: 14,
    subcategorySlug: "sex-shop-desodorantes",
    imageFile: "desodorante-intimo-morango.png",
    featured: true,
  },
];

async function main() {
  console.log("Iniciando seed da seção Sex Shop...\n");

  // Upsert parent category
  const parentCategory = await prisma.category.upsert({
    where: { slug: CATEGORY_SLUG },
    update: { name: "Sex Shop", description: "Produtos adultos com discrição e qualidade. Entrega sigilosa.", active: true },
    create: { name: "Sex Shop", slug: CATEGORY_SLUG, description: "Produtos adultos com discrição e qualidade. Entrega sigilosa.", order: 1, active: true },
  });
  console.log(`Categoria principal: ${parentCategory.name} (${parentCategory.id})`);

  // Upsert subcategories
  const subcategoryIds = new Map<string, string>();
  for (const sub of SUBCATEGORIES) {
    const saved = await prisma.category.upsert({
      where: { slug: sub.slug },
      update: { name: sub.name, description: sub.description, order: sub.order, active: true, parentId: parentCategory.id },
      create: { name: sub.name, slug: sub.slug, description: sub.description, order: sub.order, active: true, parentId: parentCategory.id },
    });
    subcategoryIds.set(sub.slug, saved.id);
    console.log(`  Subcategoria: ${saved.name}`);
  }

  // Upsert products
  let created = 0;
  let skipped = 0;
  for (const product of PRODUCTS) {
    const subcategoryId = subcategoryIds.get(product.subcategorySlug);
    if (!subcategoryId) { console.log(`  ⚠ Subcategoria não encontrada: ${product.subcategorySlug}`); skipped++; continue; }

    const imageUrl = `/uploads/products/${product.imageFile}`;

    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    if (existing) {
      console.log(`  ~ Já existe: ${product.slug}`);
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        promotionalPrice: null,
        stock: product.stock,
        minStock: 2,
        weight: 0.1,
        height: 3,
        width: 8,
        length: 12,
        featured: product.featured ?? false,
        isNew: product.isNew ?? false,
        active: true,
        sku: product.sku ?? undefined,
        categoryId: parentCategory.id,
        subcategoryId,
        images: {
          create: [{ url: imageUrl, alt: product.name, order: 0 }],
        },
      },
    });

    console.log(`  ✓ ${product.name} — R$${product.price} — ${product.sku ?? "sem SKU"}`);
    created++;
  }

  console.log(`\nSeed concluído!`);
  console.log(`  Produtos criados: ${created}`);
  console.log(`  Ignorados: ${skipped}`);
  console.log(`  Imagens em: /uploads/products/`);
}

main()
  .catch((error) => {
    console.error("Erro no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
