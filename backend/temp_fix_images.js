const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = '/uploads/products/';

// Mapeamento SKU → imagem correta
const IMAGE_FIX = [
  // Corrigir imagens erradas de produtos existentes
  { sku: '3104000004742', name: 'Anel Peniano Rosa de Orelha',       image: 'anel-peniano-rosa-de-orelha-3104000004742.jpg' },
  { sku: '3104000004741', name: 'Anel Peniano Roxo de Orelha',       image: 'anel-peniano-roxo-de-orelha-3104000004741.jpg' },
  { sku: '3104000004747', name: 'Anel Peniano Sexy Bolinha Transp.',  image: 'anel-peniano-sexy-bolinha-transp-3104000004747.jpg' },
];

// Produtos faltando — adicionar ao banco
const MISSING_PRODUCTS = [
  { sku: '3104000004749', name: 'Anel Peniano Sexy Ursinho Preto', slug: 'anel-peniano-sexy-ursinho-preto', image: 'anel-peniano-sexy-ursinho-preto-3104000004749.jpg',  subcategSlug: 'sex-shop-aneis' },
  { sku: '3104000004748', name: 'Anel Peniano Sexy Ursinho Transp.', slug: 'anel-peniano-sexy-ursinho-transp', image: 'anel-peniano-sexy-ursinho-transp-3104000004748.jpg', subcategSlug: 'sex-shop-aneis' },
  { sku: '3104000004745', name: 'Anel Peniano Sexy Bolinha Preto',  slug: 'anel-peniano-sexy-bolinha-preto', image: 'anel-peniano-sexy-bolinha-preto-3104000004745.jpg',  subcategSlug: 'sex-shop-aneis' },
  { sku: '3104000004746', name: 'Anel Peniano Sexy Bolinha Rosa',   slug: 'anel-peniano-sexy-bolinha-rosa', image: 'anel-peniano-sexy-bolinha-rosa-3104000004746.jpg',   subcategSlug: 'sex-shop-aneis' },
  { sku: '3104000004743', name: 'Dedeira com Textura Sexy Rosa',    slug: 'dedeira-com-textura-sexy-rosa', image: 'dedeira-com-textura-sexy-rosa-3104000004743.jpg',    subcategSlug: 'sex-shop-aneis' },
  { sku: '3104000004744', name: 'Dedeira com Textura Sexy Roxo',    slug: 'dedeira-com-textura-sexy-roxo', image: 'dedeira-com-textura-sexy-roxo-3104000004744.jpg',    subcategSlug: 'sex-shop-aneis' },
];

async function main() {
  // 1. Corrigir imagens dos produtos existentes
  console.log('\n=== CORRIGINDO IMAGENS TROCADAS ===');
  for (const fix of IMAGE_FIX) {
    const product = await prisma.product.findFirst({ where: { sku: fix.sku } });
    if (!product) { console.log(`  [NAO ENCONTRADO] ${fix.name}`); continue; }

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: { productId: product.id, url: BASE_URL + fix.image, alt: fix.name, order: 0 }
    });
    console.log(`  ✓ ${fix.name} → ${fix.image}`);
  }

  // 2. Buscar categoria sex-shop e subcategoria anéis
  const sexShopCat = await prisma.category.findFirst({ where: { slug: 'sex-shop' } });
  if (!sexShopCat) { console.log('ERRO: categoria sex-shop não encontrada'); return; }

  const aneisCat = await prisma.category.findFirst({ where: { slug: 'sex-shop-aneis' } });
  if (!aneisCat) { console.log('ERRO: subcategoria sex-shop-aneis não encontrada'); return; }

  // 3. Adicionar produtos faltando
  console.log('\n=== ADICIONANDO PRODUTOS FALTANDO ===');
  for (const p of MISSING_PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { OR: [{ sku: p.sku }, { slug: p.slug }] } });
    if (existing) {
      // Só corrigir imagem
      await prisma.productImage.deleteMany({ where: { productId: existing.id } });
      await prisma.productImage.create({
        data: { productId: existing.id, url: BASE_URL + p.image, alt: p.name, order: 0 }
      });
      console.log(`  ~ ${p.name} (já existia, imagem corrigida)`);
      continue;
    }

    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: `${p.name} — acessório adulto de uso pessoal.`,
        price: 12,
        stock: 10,
        weight: 0.05,
        height: 3,
        width: 8,
        length: 10,
        active: true,
        featured: false,
        isNew: false,
        categoryId: sexShopCat.id,
        subcategoryId: aneisCat.id,
        images: {
          create: [{ url: BASE_URL + p.image, alt: p.name, order: 0 }]
        }
      }
    });
    console.log(`  ✓ Criado: ${p.name} → ${p.image}`);
  }

  // 4. Resumo
  const total = await prisma.product.count({ where: { category: { slug: 'sex-shop' } } });
  console.log(`\n=== RESUMO ===`);
  console.log(`Total produtos sex shop no banco: ${total}`);
  console.log('Imagens corrigidas: ' + IMAGE_FIX.length);
  console.log('Produtos adicionados/corrigidos: ' + MISSING_PRODUCTS.length);
}

main().catch(console.error).finally(() => prisma['$disconnect']());
