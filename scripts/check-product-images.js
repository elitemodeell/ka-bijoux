const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Mostrar URL completa dos produtos problemáticos
  const products = await prisma.product.findMany({
    where: {
      name: {
        in: [
          'CACHECOL LISO POMPOM', 'CACHECOL XADREZ', 'LAÇO BRASIL',
          'CONJUNTO COLAR + BRINCO BRASIL', 'CAPA CASE IPHONE 16E',
          'CACHECOL XADREZ PREMIUM',
        ]
      }
    },
    include: { images: true, category: { select: { slug: true } } },
  });

  if (products.length === 0) {
    // Tentar com contains
    const all = await prisma.product.findMany({
      where: {
        category: { slug: { not: 'sex-shop' } },
        name: { contains: 'CACHECOL' }
      },
      include: { images: true, category: { select: { slug: true } } },
    });
    for (const p of all) {
      console.log(p.name, '|', p.category?.slug);
      p.images.forEach(i => console.log('  URL COMPLETA:', i.url));
      if (!p.images.length) console.log('  (sem imagem)');
    }
    return;
  }

  for (const p of products) {
    console.log(p.name, '|', p.category?.slug);
    p.images.forEach(i => console.log('  URL COMPLETA:', i.url));
    if (!p.images.length) console.log('  (sem imagem)');
  }
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect());
