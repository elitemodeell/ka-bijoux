/**
 * import-produtos-atualizados.js
 *
 * Importa produtos sex shop das pastas:
 *  - C:\Users\bruno\Downloads\produtos atualizados  (ChatGPT images)
 *  - C:\Users\bruno\Downloads\produtos editar editados\montagens-finais  (processed proteses)
 *
 * Uso:
 *   NODE_PATH=backend/node_modules node scripts/import-produtos-atualizados.js          # dry-run
 *   NODE_PATH=backend/node_modules node scripts/import-produtos-atualizados.js --execute
 */

const path  = require('path');
const https = require('https');
const fs    = require('fs');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');

const SUPABASE_PROJECT  = 'sxohqngzypmxtmuulfoa';
const SUPABASE_BASE_URL = `https://${SUPABASE_PROJECT}.supabase.co/storage/v1/object/public/products`;
const BUCKET            = 'products';
const SERVICE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PASTA_ATUALIZADOS  = path.join('C:\\Users\\bruno\\Downloads\\produtos atualizados');
const PASTA_MONTAGENS    = path.join('C:\\Users\\bruno\\Downloads\\produtos editar editados\\montagens-finais');

const CAT_SEX_SHOP = 'cat-sex-shop';
const SUB_ACESSORIOS = 'cmr6c4ena000pfu1puxy7mx2v';
const SUB_BALAS      = 'sub-balas';
const SUB_GEIS       = 'sub-geis';
const SUB_DESOD      = 'sub-desodorantes';
const SUB_PROTESES   = 'cmr6c4eph000rfu1pq77nead8';

// Prefixo dos arquivos ChatGPT de 1/jul
const PFX1 = 'ChatGPT Image 1 de jul. de 2026, ';
// Prefixo dos arquivos de 30/jun
const PFX0 = 'ChatGPT Image 30 de jun. de 2026, ';

// ──────────────────────────────────────────────────────────────────────────────
// Lista de produtos
// action: 'create' | 'add_images'
// existingId: DB id (only for action=add_images)
// ──────────────────────────────────────────────────────────────────────────────
const PRODUTOS = [
  // ── produtos atualizados ────────────────────────────────────────────────────
  {
    action: 'create',
    name: 'FORSEXY HOT LEITE CONDENSADO 30ML',
    blingId: null, sku: null,
    price: 30, stock: 5,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_GEIS,
    importSource: 'MANUAL',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '09_18_52 (2).png',
      PFX1 + '09_18_53 (3).png',
      PFX1 + '09_18_53 (4).png',
      PFX1 + '09_18_54 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'TATTOO TEMPORARIA SEXY',
    blingId: '16516511297', sku: '3104000000814',
    price: 8, stock: 0,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_ACESSORIOS,
    importSource: 'BLING',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '09_19_15 (1).png',
      PFX1 + '09_19_15 (2).png',
      PFX1 + '09_19_15 (3).png',
      PFX1 + '09_19_16 (4).png',
      PFX1 + '09_19_17 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'SEXY BALLS OLHO DE TANDERA',
    blingId: null, sku: null,
    price: 25, stock: 5,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_BALAS,
    importSource: 'MANUAL',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '09_28_42 (1).png',
      PFX1 + '09_28_42 (2).png',
      PFX1 + '09_28_42 (3).png',
      PFX1 + '09_28_43 (4).png',
    ],
  },
  {
    action: 'create',
    name: 'SEXY BALLS LOOPING FORSEXY',
    blingId: null, sku: null,
    price: 25, stock: 5,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_BALAS,
    importSource: 'MANUAL',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '09_31_01 (1).png',
      PFX1 + '09_31_02 (2).png',
      PFX1 + '09_31_02 (3).png',
      PFX1 + '09_31_03 (4).png',
      PFX1 + '09_31_03 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'BOLINHA TAILANDESA SEXY',
    blingId: '16516505900', sku: '3104000000796',
    price: 17, stock: 7,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_BALAS,
    importSource: 'BLING',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '09_35_51 (1).png',
      PFX1 + '09_35_51 (2).png',
      PFX1 + '09_35_53 (3).png',
      PFX1 + '09_35_53 (4).png',
      PFX1 + '09_35_54 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'SEXY BALLS 100 DOR 6X1',
    blingId: null, sku: null,
    price: 25, stock: 5,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_BALAS,
    importSource: 'MANUAL',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '09_39_47 (1).png',
      PFX1 + '09_39_47 (2).png',
      PFX1 + '09_39_48 (4).png',
      PFX1 + '09_39_48 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'FORSEXY ICE CEREJA 15ML',
    blingId: null, sku: null,
    price: 30, stock: 5,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_GEIS,
    importSource: 'MANUAL',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '09_46_55 (1).png',
      PFX1 + '09_46_56 (3).png',
      PFX1 + '09_46_56 (4).png',
      PFX1 + '09_46_57 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'FORSEXY ICE MENTA 15ML',
    blingId: null, sku: null,
    price: 30, stock: 5,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_GEIS,
    importSource: 'MANUAL',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '09_47_45 (2).png',
      PFX1 + '09_47_45 (3).png',
      PFX1 + '09_47_46 (4).png',
    ],
  },
  {
    action: 'create',
    name: 'PERFUME DE CUECA SEXY',
    blingId: '16652984502', sku: '3104000004388',
    price: 12, stock: 6,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_ACESSORIOS,
    importSource: 'BLING',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '09_50_58 (1).png',
      PFX1 + '09_50_58 (2).png',
      PFX1 + '09_50_59 (3).png',
      PFX1 + '09_50_59 (4).png',
      PFX1 + '09_51_00 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'QUERO MAIS GEL SEGRED LOVE 20ML',
    blingId: null, sku: null,
    price: 20, stock: 5,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_GEIS,
    importSource: 'MANUAL',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '10_13_28 (1).png',
      PFX1 + '10_13_28 (2).png',
      PFX1 + '10_13_29 (3).png',
      PFX1 + '10_13_29 (4).png',
      PFX1 + '10_13_29 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'MEIA ARRASTAO ADULTO',
    blingId: '16440937080', sku: '3104000000393',
    price: 24, stock: 174,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_ACESSORIOS,
    importSource: 'BLING',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '10_28_10 (1).png',
      PFX1 + '10_28_10 (2).png',
      PFX1 + '10_28_10 (3).png',
      PFX1 + '10_28_10 (4).png',
      PFX1 + '10_28_11 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'MASCARA SENSUAL PRETA',
    blingId: null, sku: null,
    price: 25, stock: 5,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_ACESSORIOS,
    importSource: 'MANUAL',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '10_34_17 (1).png',
      PFX1 + '10_34_17 (2).png',
      PFX1 + '10_34_18 (3).png',
      PFX1 + '10_34_18 (4).png',
      PFX1 + '10_34_19 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'PERFUME DE CALCINHA SEXY',
    blingId: '16516507412', sku: '3104000000802',
    price: 12, stock: 74,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_ACESSORIOS,
    importSource: 'BLING',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '10_39_16 (1).png',
      PFX1 + '10_39_16 (2).png',
      PFX1 + '10_39_16 (3).png',
      PFX1 + '10_39_17 (4).png',
      PFX1 + '10_39_18 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'DESODORANTE INTIMO BABASOUL',
    blingId: '16539822514', sku: '3104000001603',
    price: 24, stock: 4,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_DESOD,
    importSource: 'BLING',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '10_42_28 (1).png',
      PFX1 + '10_42_28 (2).png',
      PFX1 + '10_42_29 (3).png',
      PFX1 + '10_42_30 (4).png',
      PFX1 + '10_42_30 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'CHICOTE SEXY',
    blingId: '16543776912', sku: '3104000001672',
    price: 12, stock: 10,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_ACESSORIOS,
    importSource: 'BLING',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '10_44_51 (1).png',
      PFX1 + '10_44_51 (2).png',
      PFX1 + '10_44_51 (3).png',
      PFX1 + '10_44_52 (4).png',
    ],
  },
  // ── Plugs: apenas adicionar imagens (já existem no DB) ──────────────────────
  {
    action: 'add_images',
    existingId: 'cmr6i20tx009vrhf8qk0jtm4e', // PLUG METAL SEXY
    name: 'PLUG METAL SEXY',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '13_31_11 (1).png',
      PFX1 + '13_31_12 (2).png',
      PFX1 + '13_31_13 (3).png',
    ],
  },
  {
    action: 'add_images',
    existingId: 'cmr6i20q5009srhf8c4mlnoej', // PLUG METAL PREMIUM SEXY
    name: 'PLUG METAL PREMIUM SEXY',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '13_31_43 (1).png',
      PFX1 + '13_31_44 (2).png',
      PFX1 + '13_31_47 (3).png',
      PFX1 + '13_31_47 (4).png',
      PFX1 + '13_31_48 (5).png',
    ],
  },
  // ── Novos plugs ─────────────────────────────────────────────────────────────
  {
    action: 'create',
    name: 'PLUG M CORACAO ROXO',
    blingId: '16669030335', sku: '3104000005008',
    price: 36, stock: 2,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_ACESSORIOS,
    importSource: 'BLING',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '13_32_08 (1).png',
      PFX1 + '13_32_08 (2).png',
      PFX1 + '13_32_08 (3).png',
      PFX1 + '13_32_09 (4).png',
      PFX1 + '13_32_09 (5).png',
    ],
  },
  {
    action: 'create',
    name: 'PLUG M CORACAO CRISTAL',
    blingId: '16669030333', sku: '3104000005006',
    price: 36, stock: 2,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_ACESSORIOS,
    importSource: 'BLING',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX1 + '13_36_52 (1).png',
      PFX1 + '13_36_56 (2).png',
      PFX1 + '13_36_57 (3).png',
      PFX1 + '13_36_58 (4).png',
      PFX1 + '13_36_58 (5).png',
    ],
  },
  // ── Algema Branca: adicionar imagens extras ─────────────────────────────────
  {
    action: 'add_images',
    existingId: 'cmr6i1qkm001yrhf8lx08rior', // ALGEMA BRANCA VELUDO
    name: 'ALGEMA BRANCA VELUDO',
    pasta: PASTA_ATUALIZADOS,
    files: [
      PFX0 + '20_44_00 (3).png',
      PFX0 + '20_45_31 (2).png',
      PFX0 + '20_45_50.png',
      PFX0 + '20_46_07.png',
      PFX0 + '20_46_24.png',
    ],
  },
  // ── Próteses editadas (montagens-finais, SKU confirmado) ────────────────────
  {
    action: 'create',
    name: 'MYDICK PROTESE COM ESCROTO',
    blingId: '16668617563', sku: '3104000004938',
    price: 48, stock: 3,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_PROTESES,
    importSource: 'BLING',
    pasta: PASTA_MONTAGENS,
    files: ['01-mydick-protese-com-escroto.png'],
  },
  {
    action: 'create',
    name: 'PROTESE P SEXY NUDE',
    blingId: '16668642258', sku: '3104000004943',
    price: 24, stock: 1,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_PROTESES,
    importSource: 'BLING',
    pasta: PASTA_MONTAGENS,
    files: ['02-protese-p-sexy-nude.png'],
  },
  {
    action: 'create',
    name: 'PROTESE PP COM ESCROTO',
    blingId: '16668647240', sku: '3104000004945',
    price: 24, stock: 1,
    categoryId: CAT_SEX_SHOP, subcategoryId: SUB_PROTESES,
    importSource: 'BLING',
    pasta: PASTA_MONTAGENS,
    files: ['03-protese-pp-com-escroto.png'],
  },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function uploadToSupabase(filename, buffer, contentType = 'image/png') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${SUPABASE_PROJECT}.supabase.co`,
      path: `/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`,
      method: 'POST',
      headers: {
        'apikey':         SERVICE_KEY,
        'Authorization':  `Bearer ${SERVICE_KEY}`,
        'Content-Type':   contentType,
        'Content-Length': buffer.length,
        'x-upsert':       'true',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) resolve(`${SUPABASE_BASE_URL}/${filename}`);
        else reject(new Error(`Supabase HTTP ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

async function main() {
  console.log(`\n=== import-produtos-atualizados.js — ${DRY_RUN ? 'DRY RUN' : '*** EXECUÇÃO REAL ***'} ===\n`);

  let ok = 0, skipped = 0, errors = 0;

  for (const produto of PRODUTOS) {
    console.log(`\n[${produto.action.toUpperCase()}] ${produto.name}`);

    // Verificar se já existe (para action=create)
    let existingId = produto.existingId ?? null;
    if (produto.action === 'create') {
      const conditions = [];
      if (produto.sku)     conditions.push({ sku:     produto.sku });
      if (produto.blingId) conditions.push({ blingId: produto.blingId });
      const nameSlug = slugify(produto.name);
      conditions.push({ slug: nameSlug });

      const existing = await prisma.product.findFirst({
        where: { OR: conditions },
        select: { id: true, name: true, sku: true },
      });

      if (existing) {
        console.log(`  [JÁ EXISTE] id=${existing.id} name=${existing.name} — adicionando apenas imagens`);
        existingId = existing.id;
        produto.action = 'add_images';
      }
    }

    // Verificar arquivos
    const filePaths = produto.files.map(f => path.join(produto.pasta, f));
    const missingFiles = filePaths.filter(f => !fs.existsSync(f));
    if (missingFiles.length > 0) {
      console.log(`  [SKIP] Arquivos não encontrados:\n  ${missingFiles.join('\n  ')}`);
      skipped++;
      continue;
    }
    console.log(`  Arquivos: ${produto.files.length} imagens OK`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Não processado`);
      continue;
    }

    try {
      // Criar produto se necessário
      if (produto.action === 'create' && !existingId) {
        const nameSlug = slugify(produto.name);
        const slugExists = await prisma.product.findUnique({ where: { slug: nameSlug } });
        const finalSlug = slugExists ? `${nameSlug}-${Date.now()}` : nameSlug;

        const created = await prisma.product.create({
          data: {
            name:           produto.name,
            slug:           finalSlug,
            description:    produto.name,
            price:          produto.price,
            stock:          produto.stock,
            minStock:       2,
            weight:         0.1,
            height:         10,
            width:          10,
            length:         10,
            categoryId:     produto.categoryId,
            subcategoryId:  produto.subcategoryId,
            sku:            produto.sku  || null,
            blingId:        produto.blingId || null,
            importSource:   produto.importSource,
            enrichmentStatus: 'PENDING_RESEARCH',
            publicationStatus: 'PUBLISHED',
            active: true,
            isNew:  true,
            featured: false,
          },
          select: { id: true },
        });
        existingId = created.id;
        console.log(`  Produto criado: id=${existingId}`);
      }

      // Upload e criar imagens
      let imgCount = 0;
      const slug = slugify(produto.name);

      for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const buffer = fs.readFileSync(filePath);
        const filename = `${slug}-${(existingId ?? '').slice(-6)}-0${i + 1}.png`;

        const supaUrl = await uploadToSupabase(filename, buffer, 'image/png');

        await prisma.productImage.create({
          data: {
            url:       supaUrl,
            alt:       produto.name,
            order:     i,
            productId: existingId,
          },
        });

        imgCount++;
        process.stdout.write('.');
        await sleep(200);
      }

      console.log(`\n  ✓ ${imgCount} imagens importadas`);
      ok++;
    } catch (err) {
      console.log(`\n  ✗ Erro: ${err.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  console.log(`  Produtos processados: ${ok}`);
  console.log(`  Skipped:              ${skipped}`);
  console.log(`  Erros:                ${errors}`);
  console.log(`  Total produtos:       ${PRODUTOS.length}`);
}

main()
  .catch(e => { console.error('Erro fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
