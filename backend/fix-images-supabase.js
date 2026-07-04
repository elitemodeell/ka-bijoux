const { PrismaClient } = require('@prisma/client');
const https = require('https');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const SUPABASE_PROJECT = process.env.SUPABASE_PROJECT_ID || 'sxohqngzypmxtmuulfoa';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'products';
const IMAGES_DIR = path.join(__dirname, 'public', 'uploads', 'products');

const SUPABASE_PUBLIC_BASE = `https://${SUPABASE_PROJECT}.supabase.co/storage/v1/object/public/${BUCKET}`;

// Products whose images are wrong — map SKU → correct image filename
const FIX_IMAGE = [
  { sku: '3104000004742', name: 'Anel Peniano Rosa de Orelha',            image: 'anel-peniano-rosa-de-orelha-3104000004742.jpg' },
  { sku: '3104000004741', name: 'Anel Peniano Roxo de Orelha',            image: 'anel-peniano-roxo-de-orelha-3104000004741.jpg' },
  { sku: '3104000004747', name: 'Anel Peniano Sexy Bolinha Transparente', image: 'anel-peniano-sexy-bolinha-transp-3104000004747.jpg' },
];

// Products missing from DB — add them
const MISSING_PRODUCTS = [
  { sku: '3104000004749', name: 'Anel Peniano Sexy Ursinho Preto',     slug: 'anel-peniano-sexy-ursinho-preto',  image: 'anel-peniano-sexy-ursinho-preto-3104000004749.jpg' },
  { sku: '3104000004748', name: 'Anel Peniano Sexy Ursinho Transp.',   slug: 'anel-peniano-sexy-ursinho-transp', image: 'anel-peniano-sexy-ursinho-transp-3104000004748.jpg' },
  { sku: '3104000004745', name: 'Anel Peniano Sexy Bolinha Preto',     slug: 'anel-peniano-sexy-bolinha-preto',  image: 'anel-peniano-sexy-bolinha-preto-3104000004745.jpg' },
  { sku: '3104000004746', name: 'Anel Peniano Sexy Bolinha Rosa',      slug: 'anel-peniano-sexy-bolinha-rosa',   image: 'anel-peniano-sexy-bolinha-rosa-3104000004746.jpg' },
  { sku: '3104000004743', name: 'Dedeira com Textura Sexy Rosa',       slug: 'dedeira-com-textura-sexy-rosa',   image: 'dedeira-com-textura-sexy-rosa-3104000004743.jpg' },
  { sku: '3104000004744', name: 'Dedeira com Textura Sexy Roxo',       slug: 'dedeira-com-textura-sexy-roxo',   image: 'dedeira-com-textura-sexy-roxo-3104000004744.jpg' },
];

function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}

function uploadToSupabase(filename, fileBuffer, mimeType) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${SUPABASE_PROJECT}.supabase.co`,
      path: `/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length,
        'x-upsert': 'true',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(`${SUPABASE_PUBLIC_BASE}/${filename}`);
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

async function uploadFile(filename) {
  const filePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] Arquivo não encontrado: ${filename}`);
    return null;
  }
  const buffer = fs.readFileSync(filePath);
  const mimeType = getMimeType(filename);
  const publicUrl = await uploadToSupabase(filename, buffer, mimeType);
  return publicUrl;
}

async function main() {
  // ── 1. Upload all local images to Supabase Storage ──────────────────────
  console.log('\n=== 1. ENVIANDO IMAGENS PARA SUPABASE STORAGE ===');
  const files = fs.readdirSync(IMAGES_DIR);
  const uploadMap = {}; // filename → supabase url
  let uploaded = 0, skipped = 0;

  for (const file of files) {
    try {
      const url = await uploadFile(file);
      if (url) {
        uploadMap[file] = url;
        uploaded++;
        if (uploaded % 20 === 0) console.log(`  Enviados: ${uploaded}/${files.length}`);
      } else {
        skipped++;
      }
    } catch (err) {
      console.log(`  [ERRO] ${file}: ${err.message}`);
      skipped++;
    }
  }
  console.log(`  Total enviados: ${uploaded} | Skipped: ${skipped}`);

  // ── 2. Atualizar todas as URLs no banco (/uploads/products/X → Supabase) ──
  console.log('\n=== 2. ATUALIZANDO URLS NO BANCO ===');
  const allImages = await prisma.productImage.findMany({
    where: { url: { startsWith: '/uploads/products/' } },
  });
  console.log(`  Registros com URL local: ${allImages.length}`);

  let updated = 0, notFound = 0;
  for (const img of allImages) {
    const filename = img.url.replace('/uploads/products/', '');
    const newUrl = uploadMap[filename] || `${SUPABASE_PUBLIC_BASE}/${filename}`;
    await prisma.productImage.update({
      where: { id: img.id },
      data: { url: newUrl },
    });
    updated++;
  }
  console.log(`  URLs atualizadas: ${updated}`);

  // ── 3. Corrigir imagens erradas (por SKU) ────────────────────────────────
  console.log('\n=== 3. CORRIGINDO IMAGENS ERRADAS ===');
  for (const fix of FIX_IMAGE) {
    const product = await prisma.product.findFirst({ where: { sku: fix.sku } });
    if (!product) { console.log(`  [NAO ENCONTRADO] ${fix.name} (SKU ${fix.sku})`); continue; }

    const correctUrl = `${SUPABASE_PUBLIC_BASE}/${fix.image}`;

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: { productId: product.id, url: correctUrl, alt: fix.name, order: 0 },
    });
    console.log(`  ✓ ${fix.name} → ${fix.image}`);
  }

  // ── 4. Adicionar produtos faltando ───────────────────────────────────────
  console.log('\n=== 4. ADICIONANDO PRODUTOS FALTANDO ===');
  const sexShopCat = await prisma.category.findFirst({ where: { slug: 'sex-shop' } });
  if (!sexShopCat) { console.log('ERRO: categoria sex-shop não encontrada'); return; }

  const aneisCat = await prisma.category.findFirst({ where: { slug: 'sex-shop-aneis' } });
  if (!aneisCat) { console.log('ERRO: subcategoria sex-shop-aneis não encontrada'); return; }

  for (const p of MISSING_PRODUCTS) {
    const existing = await prisma.product.findFirst({
      where: { OR: [{ sku: p.sku }, { slug: p.slug }] },
    });

    const correctUrl = `${SUPABASE_PUBLIC_BASE}/${p.image}`;

    if (existing) {
      await prisma.productImage.deleteMany({ where: { productId: existing.id } });
      await prisma.productImage.create({
        data: { productId: existing.id, url: correctUrl, alt: p.name, order: 0 },
      });
      console.log(`  ~ ${p.name} (já existia — imagem corrigida)`);
      continue;
    }

    await prisma.product.create({
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
        images: { create: [{ url: correctUrl, alt: p.name, order: 0 }] },
      },
    });
    console.log(`  ✓ Criado: ${p.name}`);
  }

  // ── 5. Resumo ─────────────────────────────────────────────────────────────
  const totalProducts = await prisma.product.count();
  const sexShopCount = await prisma.product.count({ where: { category: { slug: 'sex-shop' } } });
  const localUrlsLeft = await prisma.productImage.count({ where: { url: { startsWith: '/uploads/products/' } } });

  console.log('\n=== RESUMO ===');
  console.log(`Total produtos no banco: ${totalProducts}`);
  console.log(`Produtos sex shop: ${sexShopCount}`);
  console.log(`URLs locais restantes: ${localUrlsLeft} (deve ser 0)`);
  console.log(`Imagens enviadas para Supabase: ${uploaded}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
