import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados KA Bijoux...");

  // Admin padrão
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
  console.log("✅ Admin criado:", admin.email);

  // Configurações da loja
  await prisma.storeSettings.upsert({
    where: { id: "store-settings-1" },
    update: {},
    create: {
      id: "store-settings-1",
      storeName: "KA Bijoux",
      storeAddress: "Rua das Flores, 123 - Centro",
      storeCity: "Itaúna",
      storeState: "MG",
      storeZipCode: "35680-000",
      storePhone: "(37) 99999-9999",
      storeWhatsapp: "5537999999999",
      storeEmail: "contato@kabijoux.com.br",
      storeHours: "Seg-Sex: 9h às 18h | Sáb: 9h às 14h",
      mototaxiPrice: 10.0,
      mototaxiEnabled: true,
      correiosEnabled: true,
      storePickupEnabled: true,
    },
  });
  console.log("✅ Configurações da loja criadas");

  // Categorias
  const categories = [
    { name: "Bijuterias", slug: "bijuterias", order: 1 },
    { name: "Acessórios", slug: "acessorios", order: 2 },
    { name: "Perfumes", slug: "perfumes", order: 3 },
    { name: "Presentes", slug: "presentes", order: 4 },
    { name: "Roupas Femininas", slug: "roupas-femininas", order: 5 },
    { name: "Roupas Masculinas", slug: "roupas-masculinas", order: 6 },
    { name: "Capinhas", slug: "capinhas", order: 7 },
    { name: "Beleza", slug: "beleza", order: 8 },
    { name: "Decoração", slug: "decoracao", order: 9 },
    { name: "Óculos", slug: "oculos", order: 10 },
    { name: "Promoções", slug: "promocoes", order: 11 },
    { name: "Novidades", slug: "novidades", order: 12 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("✅ Categorias criadas:", categories.length);

  const bijuteriasCat = await prisma.category.findUnique({ where: { slug: "bijuterias" } });
  const acessoriosCat = await prisma.category.findUnique({ where: { slug: "acessorios" } });
  const perfumesCat = await prisma.category.findUnique({ where: { slug: "perfumes" } });
  const belezaCat = await prisma.category.findUnique({ where: { slug: "beleza" } });

  // Produtos mockados
  const products = [
    {
      name: "Colar Dourado Coração",
      slug: "colar-dourado-coracao",
      description: "Lindo colar dourado com pingente de coração. Banhado a ouro 18k. Perfeito para presentear ou usar no dia a dia.",
      price: 29.9,
      promotionalPrice: null,
      stock: 50,
      weight: 0.05,
      height: 1, width: 8, length: 10,
      featured: true, isNew: true,
      categoryId: bijuteriasCat!.id,
    },
    {
      name: "Brinco Argola Rosé Gold",
      slug: "brinco-argola-rose-gold",
      description: "Brinco argola rosé gold delicado. Perfeito para qualquer ocasião.",
      price: 19.9,
      promotionalPrice: 14.9,
      stock: 80,
      weight: 0.02,
      height: 1, width: 6, length: 8,
      featured: true, isNew: false,
      categoryId: bijuteriasCat!.id,
    },
    {
      name: "Pulseira Feminina Charme",
      slug: "pulseira-feminina-charme",
      description: "Pulseira feminina com detalhes encantadores. Banhada a ouro.",
      price: 24.9,
      promotionalPrice: null,
      stock: 35,
      weight: 0.03,
      height: 1, width: 7, length: 9,
      featured: false, isNew: true,
      categoryId: bijuteriasCat!.id,
    },
    {
      name: "Óculos de Sol Feminino Gatinho",
      slug: "oculos-sol-feminino-gatinho",
      description: "Óculos de sol feminino no estilo gatinho. Lentes com proteção UV400.",
      price: 39.9,
      promotionalPrice: 34.9,
      stock: 25,
      weight: 0.15,
      height: 5, width: 15, length: 18,
      featured: true, isNew: false,
      categoryId: acessoriosCat!.id,
    },
    {
      name: "Perfume Floral Feminino 100ml",
      slug: "perfume-floral-feminino-100ml",
      description: "Perfume floral com notas de rosa, jasmim e sândalo. Duração de até 8 horas.",
      price: 59.9,
      promotionalPrice: null,
      stock: 20,
      weight: 0.3,
      height: 12, width: 7, length: 7,
      featured: true, isNew: true,
      categoryId: perfumesCat!.id,
    },
    {
      name: "Kit Skincare Hidratante",
      slug: "kit-skincare-hidratante",
      description: "Kit completo de skincare com creme hidratante, tônico e sérum facial.",
      price: 89.9,
      promotionalPrice: 79.9,
      stock: 15,
      weight: 0.5,
      height: 15, width: 20, length: 20,
      featured: false, isNew: true,
      categoryId: belezaCat!.id,
    },
    {
      name: "Anel Solitário Prata",
      slug: "anel-solitario-prata",
      description: "Anel solitário em prata com zircônia. Elegante e sofisticado.",
      price: 34.9,
      promotionalPrice: null,
      stock: 40,
      weight: 0.02,
      height: 1, width: 3, length: 5,
      featured: false, isNew: false,
      categoryId: bijuteriasCat!.id,
    },
    {
      name: "Bolsa Transversal Feminina",
      slug: "bolsa-transversal-feminina",
      description: "Bolsa transversal feminina em couro sintético. Prática e estilosa.",
      price: 69.9,
      promotionalPrice: 59.9,
      stock: 18,
      weight: 0.4,
      height: 20, width: 25, length: 10,
      featured: true, isNew: true,
      categoryId: acessoriosCat!.id,
    },
  ];

  for (const prod of products) {
    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        ...prod,
        price: prod.price,
        promotionalPrice: prod.promotionalPrice ?? undefined,
        images: {
          create: [
            {
              url: `https://placehold.co/600x600/FFB6C1/FFFFFF?text=${encodeURIComponent(prod.name)}`,
              alt: prod.name,
              order: 0,
            },
          ],
        },
      },
    });
  }
  console.log("✅ Produtos criados:", products.length);

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
      title: "Promoções",
      coverImageUrl: "/images/stories/promocoes-cover.jpg",
      sortOrder: 2,
      items: [
        {
          type: "IMAGE" as const,
          mediaUrl: "/images/stories/promocoes-cover.jpg",
          duration: 5,
          text: "Achadinhos especiais por tempo limitado",
          buttonText: "Aproveitar",
          linkUrl: "/promocoes",
          sortOrder: 1,
        },
      ],
    },
    {
      id: "story-lancamentos",
      title: "Lançamentos",
      coverImageUrl: "/images/stories/lancamentos-cover.jpg",
      sortOrder: 3,
      items: [
        {
          type: "IMAGE" as const,
          mediaUrl: "/images/stories/lancamentos-cover.jpg",
          duration: 6,
          text: "Peças novas para iluminar o look",
          buttonText: "Conhecer",
          linkUrl: "/produtos",
          sortOrder: 1,
        },
      ],
    },
    {
      id: "story-brincos",
      title: "Brincos",
      coverImageUrl: "/images/stories/brincos-cover.jpg",
      sortOrder: 4,
      items: [
        {
          type: "IMAGE" as const,
          mediaUrl: "/images/stories/brincos-cover.jpg",
          duration: 5,
          text: "Brincos delicados para todos os dias",
          buttonText: "Ver brincos",
          linkUrl: "/categoria/brincos",
          sortOrder: 1,
        },
      ],
    },
    {
      id: "story-pulseiras",
      title: "Pulseiras",
      coverImageUrl: "/images/stories/pulseiras-cover.jpg",
      sortOrder: 5,
      items: [
        {
          type: "IMAGE" as const,
          mediaUrl: "/images/stories/pulseiras-cover.jpg",
          duration: 5,
          text: "Combine pulseiras e crie seu mix favorito",
          buttonText: "Ver pulseiras",
          linkUrl: "/categoria/pulseiras",
          sortOrder: 1,
        },
      ],
    },
    {
      id: "story-clientes",
      title: "Clientes",
      coverImageUrl: "/images/stories/clientes-cover.jpg",
      sortOrder: 6,
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
      id: "story-bastidores",
      title: "Bastidores",
      coverImageUrl: "/images/stories/bastidores-cover.jpg",
      sortOrder: 7,
      items: [
        {
          type: "VIDEO" as const,
          mediaUrl: "/videos/stories/novidade-1.mp4",
          duration: 8,
          text: "Um pouquinho dos bastidores da loja",
          buttonText: "Conhecer loja",
          linkUrl: "/produtos",
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
  console.log("✅ Stories criados:", storySeeds.length);

  // Cliente de teste
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
          city: "Itaúna",
          state: "MG",
          zipCode: "35680-000",
          isDefault: true,
        },
      },
    },
  });
  console.log("✅ Cliente de teste criado");

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("📧 Admin: admin@kabijoux.com.br | Senha: admin123");
  console.log("📧 Cliente: cliente@teste.com | Senha: cliente123");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
