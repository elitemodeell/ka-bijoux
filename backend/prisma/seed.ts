import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATALOG_CATEGORIES, MOCK_PRODUCTS } from "../lib/catalog";

const prisma = new PrismaClient();

async function seedCategories() {
  const parentIds = new Map<string, string>();

  for (const category of CATALOG_CATEGORIES) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        order: category.order,
        active: true,
        parentId: null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        order: category.order,
        active: true,
      },
    });

    parentIds.set(category.slug, saved.id);
  }

  for (const category of CATALOG_CATEGORIES) {
    const parentId = parentIds.get(category.slug);
    if (!parentId || !category.subcategories?.length) continue;

    for (const subcategory of category.subcategories) {
      await prisma.category.upsert({
        where: { slug: subcategory.slug },
        update: {
          name: subcategory.name,
          description: subcategory.description,
          order: category.order,
          active: true,
          parentId,
        },
        create: {
          name: subcategory.name,
          slug: subcategory.slug,
          description: subcategory.description,
          order: category.order,
          active: true,
          parentId,
        },
      });
    }
  }

  return parentIds;
}

async function main() {
  console.log("Iniciando seed do banco de dados KA Bijoux...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@kabijoux.com.br" },
    update: {},
    create: {
      name: "Administrador KA Bijoux",
      email: "admin@kabijoux.com.br",
      password: adminPassword,
      role: "SUPER_ADMIN",
    },
  });
  console.log("Admin criado:", admin.email);

  await prisma.storeSettings.upsert({
    where: { id: "store-settings-1" },
    update: {},
    create: {
      id: "store-settings-1",
      storeName: "KA Bijoux",
      storeAddress: "Rua das Flores, 123 - Centro",
      storeCity: "Itauna",
      storeState: "MG",
      storeZipCode: "35680-000",
      storePhone: "(37) 99999-9999",
      storeWhatsapp: "5537999999999",
      storeEmail: "contato@kabijoux.com.br",
      storeHours: "Seg-Sex: 9h as 18h | Sab: 9h as 14h",
      mototaxiPrice: 10.0,
      mototaxiEnabled: true,
      correiosEnabled: true,
      storePickupEnabled: true,
    },
  });
  console.log("Configuracoes da loja criadas");

  const parentIds = await seedCategories();
  console.log("Categorias criadas:", CATALOG_CATEGORIES.length);

  for (let index = 0; index < MOCK_PRODUCTS.length; index += 1) {
    const product = MOCK_PRODUCTS[index];
    const categoryId = parentIds.get(product.category.slug);
    if (!categoryId) continue;

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        promotionalPrice: product.promo ?? undefined,
        stock: 30 + index * 5,
        minStock: 5,
        weight: 0.15,
        height: 5,
        width: 10,
        length: 15,
        featured: true,
        isNew: index < 4,
        active: true,
        sku: `KA-${String(index + 1).padStart(3, "0")}`,
        categoryId,
        images: {
          create: [
            {
              url: product.image,
              alt: product.name,
              order: 0,
            },
          ],
        },
      },
    });
  }
  console.log("Produtos mockados criados:", MOCK_PRODUCTS.length);

  const storySeeds = [
    {
      id: "story-novidades",
      title: "Novidades",
      coverImageUrl: "/images/stories/novidades-cover.jpg",
      sortOrder: 1,
      items: [
        {
          type: "IMAGE" as const,
          mediaUrl: "/images/stories/novidades-cover.jpg",
          duration: 5,
          text: "Novidades fresquinhas chegaram na KA Bijoux",
          buttonText: "Ver agora",
          linkUrl: "/produtos?new=true",
          sortOrder: 1,
        },
        {
          type: "VIDEO" as const,
          mediaUrl: "/videos/stories/novidade-1.mp4",
          duration: 8,
          text: "Veja os detalhes de perto",
          buttonText: "Comprar agora",
          linkUrl: "/produtos",
          sortOrder: 2,
        },
      ],
    },
    {
      id: "story-promocoes",
      title: "Promocoes",
      coverImageUrl: "/images/stories/promocoes-cover.jpg",
      sortOrder: 2,
      items: [
        {
          type: "IMAGE" as const,
          mediaUrl: "/images/stories/promocoes-cover.jpg",
          duration: 5,
          text: "Achadinhos especiais por tempo limitado",
          buttonText: "Aproveitar",
          linkUrl: "/produtos?promo=true",
          sortOrder: 1,
        },
      ],
    },
    {
      id: "story-lancamentos",
      title: "Lancamentos",
      coverImageUrl: "/images/stories/lancamentos-cover.jpg",
      sortOrder: 3,
      items: [
        {
          type: "IMAGE" as const,
          mediaUrl: "/images/stories/lancamentos-cover.jpg",
          duration: 6,
          text: "Pecas novas para iluminar o look",
          buttonText: "Conhecer",
          linkUrl: "/produtos",
          sortOrder: 1,
        },
      ],
    },
    {
      id: "story-clientes",
      title: "Clientes",
      coverImageUrl: "/images/stories/clientes-cover.jpg",
      sortOrder: 4,
      items: [
        {
          type: "IMAGE" as const,
          mediaUrl: "/images/stories/clientes-cover.jpg",
          duration: 5,
          text: "Looks reais de clientes KA Bijoux",
          buttonText: "Ver produtos",
          linkUrl: "/produtos",
          sortOrder: 1,
        },
      ],
    },
    {
      id: "story-ofertas",
      title: "Ofertas",
      coverImageUrl: "/images/stories/promocoes-cover.jpg",
      sortOrder: 5,
      items: [
        {
          type: "VIDEO" as const,
          mediaUrl: "/videos/stories/novidade-1.mp4",
          duration: 8,
          text: "Uma selecao especial da KA Bijoux",
          buttonText: "Ver ofertas",
          linkUrl: "/produtos?promo=true",
          sortOrder: 1,
        },
      ],
    },
  ];

  for (const story of storySeeds) {
    await prisma.storyGroup.upsert({
      where: { id: story.id },
      update: {
        title: story.title,
        coverImageUrl: story.coverImageUrl,
        isActive: true,
        sortOrder: story.sortOrder,
      },
      create: {
        id: story.id,
        title: story.title,
        coverImageUrl: story.coverImageUrl,
        isActive: true,
        sortOrder: story.sortOrder,
      },
    });

    await prisma.storyItem.deleteMany({ where: { storyGroupId: story.id } });
    await prisma.storyItem.createMany({
      data: story.items.map((item) => ({
        storyGroupId: story.id,
        ...item,
        isActive: true,
      })),
    });
  }
  console.log("Stories criados:", storySeeds.length);

  const customerPassword = await bcrypt.hash("cliente123", 12);
  await prisma.customer.upsert({
    where: { email: "cliente@teste.com" },
    update: {},
    create: {
      name: "Cliente Teste",
      email: "cliente@teste.com",
      phone: "(37) 98888-8888",
      passwordHash: customerPassword,
      addresses: {
        create: {
          label: "Casa",
          street: "Rua Exemplo",
          number: "456",
          neighborhood: "Centro",
          city: "Itauna",
          state: "MG",
          zipCode: "35680-000",
          isDefault: true,
        },
      },
    },
  });
  console.log("Cliente de teste criado");

  console.log("Seed concluido com sucesso!");
  console.log("Admin: admin@kabijoux.com.br | Senha: admin123");
  console.log("Cliente: cliente@teste.com | Senha: cliente123");
}

main()
  .catch((error) => {
    console.error("Erro no seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
