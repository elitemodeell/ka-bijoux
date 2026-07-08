const { PrismaClient } = require("../backend/node_modules/@prisma/client");
const prisma = new PrismaClient();

const CAT_SEX_SHOP = "cat-sex-shop";
const SUB_VIBRADORES = "sub-vibradores";

const PRODUTOS = [
  { slug:"vibrador-premium-4-rosa",   name:"Vibrador Premium 4 - Rosa",   sku:"3104000004926", price:27, stock:5, img:"vibrador-premium-4-rosa-3104000004926.png",   desc:"Vibrador premium rosa com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-7-roxo",   name:"Vibrador Premium 7 - Roxo",   sku:"3104000004929", price:27, stock:3, img:"vibrador-premium-7-roxo-3104000004929.png",   desc:"Vibrador premium roxo com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-8-rosa",   name:"Vibrador Premium 8 - Rosa",   sku:"3104000004930", price:27, stock:6, img:"vibrador-premium-8-rosa-3104000004930.png",   desc:"Vibrador premium rosa com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-10-rosa",  name:"Vibrador Premium 10 - Rosa",  sku:"3104000004916", price:27, stock:2, img:"vibrador-premium-10-rosa-3104000004916.png",  desc:"Vibrador premium rosa com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-12-rosa",  name:"Vibrador Premium 12 - Rosa",  sku:"3104000004918", price:27, stock:3, img:"vibrador-premium-12-rosa-3104000004918.png",  desc:"Vibrador premium rosa com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-13-roxo",  name:"Vibrador Premium 13 - Roxo",  sku:"3104000004919", price:27, stock:5, img:"vibrador-premium-13-roxo-3104000004919.png",  desc:"Vibrador premium roxo com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-premium-15-rosa",  name:"Vibrador Premium 15 - Rosa",  sku:"3104000004921", price:27, stock:1, img:"vibrador-premium-15-rosa-3104000004921.png",  desc:"Vibrador premium rosa com design elegante e vibração intensa. Embalagem discreta." },
  { slug:"vibrador-golfinho-rosa",    name:"Vibrador Golfinho Rosa",       sku:"3104000004751", price:12, stock:0, img:"vibrador-golfinho-rosa-3104000004751.png",    desc:"Vibrador modelo golfinho com dupla estimulação e múltiplas velocidades. Rosa." },
];

async function main() {
  let inseridos = 0;
  let pulados = 0;

  for (const p of PRODUTOS) {
    const existing = await prisma.product.findFirst({
      where: { OR: [{ slug: p.slug }, { sku: p.sku }] }
    });

    if (existing) {
      console.log(`⟳  já existe: ${p.name}`);
      pulados++;
      continue;
    }

    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: p.desc,
        price: p.price,
        stock: p.stock,
        minStock: 2,
        weight: 0.1,
        height: 5,
        width: 5,
        length: 10,
        active: true,
        featured: false,
        isNew: false,
        sku: p.sku,
        importSource: "MANUAL",
        publicationStatus: "PUBLISHED",
        categoryId: CAT_SEX_SHOP,
        subcategoryId: SUB_VIBRADORES,
        images: {
          create: {
            url: `/uploads/products/${p.img}`,
            alt: p.name,
            order: 0,
          }
        }
      }
    });

    console.log(`✓  ${p.name}`);
    inseridos++;
  }

  console.log(`\nPronto! ${inseridos} inseridos, ${pulados} já existiam.`);
}

main()
  .catch(e => { console.error("ERRO:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
