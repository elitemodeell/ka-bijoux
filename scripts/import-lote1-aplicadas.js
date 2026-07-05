/**
 * import-lote1-aplicadas.js
 *
 * Importa as 65 imagens de "produto lote 1 - aplicadas fase 2" usando o CSV de mapeamento.
 * - Usa lista-das-65-aplicadas.csv como fonte de verdade
 * - Faz upload de cada imagem para Supabase Storage (com nome descritivo do CSV)
 * - Cria registros ProductImage no banco para cada produto
 *
 * Uso:
 *   NODE_PATH=backend/node_modules node scripts/import-lote1-aplicadas.js          # dry-run
 *   NODE_PATH=backend/node_modules node scripts/import-lote1-aplicadas.js --execute # executa
 */

const path  = require('path');
const fs    = require('fs');
const https = require('https');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');

const SOURCE_DIR  = 'C:\\Users\\bruno\\Downloads\\produto lote 1\\produto lote 1 - aplicadas fase 2';
const CSV_PATH    = path.join(SOURCE_DIR, 'lista-das-65-aplicadas.csv');
const UPLOADS_DIR = path.join(BACKEND_DIR, 'public', 'uploads', 'products');

const SUPABASE_PROJECT  = 'sxohqngzypmxtmuulfoa';
const SUPABASE_BASE_URL = `https://${SUPABASE_PROJECT}.supabase.co/storage/v1/object/public/products`;
const BUCKET            = 'products';
const SERVICE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── CSV parser simples (separador ;) ────────────────────────────────────────
function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
  const headers = lines[0].split(';').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(';').map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return obj;
  });
}

// ── Supabase upload ──────────────────────────────────────────────────────────
function uploadToSupabase(filename, fileBuffer, contentType = 'image/png') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${SUPABASE_PROJECT}.supabase.co`,
      path: `/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`,
      method: 'POST',
      headers: {
        'apikey':         SERVICE_KEY,
        'Authorization':  `Bearer ${SERVICE_KEY}`,
        'Content-Type':   contentType,
        'Content-Length': fileBuffer.length,
        'x-upsert':       'true',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(`${SUPABASE_BASE_URL}/${filename}`);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

// ── Encontrar arquivo fonte no diretório ────────────────────────────────────
function findSourceFile(sourceFilename) {
  // Tenta o arquivo original (sem prefixo)
  const direct = path.join(SOURCE_DIR, sourceFilename);
  if (fs.existsSync(direct)) return direct;

  // Tenta encontrar o arquivo APLICADA_FASE2 que termina com o sourceFilename
  const files = fs.readdirSync(SOURCE_DIR);
  const match = files.find(f => f.endsWith('__' + sourceFilename));
  if (match) return path.join(SOURCE_DIR, match);

  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== import-lote1-aplicadas.js — ${DRY_RUN ? 'DRY RUN' : '*** EXECUÇÃO REAL ***'} ===\n`);

  // 1. Ler CSV
  const rows = parseCsv(CSV_PATH);
  console.log(`Entradas no CSV: ${rows.length}`);

  // 2. Agrupar por SKU
  const bySku = {};
  for (const row of rows) {
    const sku = row.sku;
    if (!bySku[sku]) bySku[sku] = [];
    bySku[sku].push(row);
  }
  const allSkus = Object.keys(bySku);
  console.log(`SKUs únicos: ${allSkus.length}\n`);

  // 3. Buscar produtos no DB por SKU
  const dbProducts = await prisma.product.findMany({
    where: { sku: { in: allSkus } },
    include: { images: { select: { id: true, url: true } } },
  });
  const dbBySku = {};
  for (const p of dbProducts) {
    if (p.sku) dbBySku[p.sku] = p;
  }
  console.log(`Produtos encontrados no DB: ${dbProducts.length} / ${allSkus.length}\n`);

  // 4. Processar cada entrada do CSV
  let uploadedCount = 0;
  let skippedCount  = 0;
  let errorCount    = 0;
  const paraRevisao = [];

  for (const sku of allSkus) {
    const entries   = bySku[sku];
    const dbProduct = dbBySku[sku];
    const nome      = entries[0].blingName;

    console.log(`\n--- ${sku} | ${nome} (${entries.length} imgs) ---`);

    if (!dbProduct) {
      console.log(`  [REVISÃO] Produto não encontrado no DB`);
      paraRevisao.push({ sku, nome, motivo: 'Produto não encontrado no DB', entries });
      continue;
    }

    const existingUrls = new Set(dbProduct.images.map(i => i.url));
    // Mapeamento de ordem atual para próxima posição disponível
    const nextOrder = dbProduct.images.length;

    for (let i = 0; i < entries.length; i++) {
      const row       = entries[i];
      const destName  = row.imageFile;  // nome descritivo do CSV
      const supaUrl   = `${SUPABASE_BASE_URL}/${destName}`;
      const srcPath   = findSourceFile(row.sourceFile);

      if (existingUrls.has(supaUrl)) {
        console.log(`  [skip] Já existe: ${destName}`);
        skippedCount++;
        continue;
      }

      if (!srcPath) {
        console.log(`  [ERRO] Arquivo fonte não encontrado: ${row.sourceFile}`);
        errorCount++;
        continue;
      }

      const ext = path.extname(srcPath).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

      console.log(`  [${String(i + 1).padStart(2, '0')}] ${destName}`);
      if (row.variationLabel) console.log(`       Variação: ${row.variationLabel}`);

      if (!DRY_RUN) {
        try {
          // Copiar localmente
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
          const destLocal = path.join(UPLOADS_DIR, destName);
          fs.copyFileSync(srcPath, destLocal);

          // Upload para Supabase
          const fileBuffer = fs.readFileSync(destLocal);
          await uploadToSupabase(destName, fileBuffer, contentType);

          // Criar ProductImage
          await prisma.productImage.create({
            data: {
              url:       supaUrl,
              alt:       row.displayName || nome,
              order:     nextOrder + i,
              productId: dbProduct.id,
            },
          });

          uploadedCount++;
          console.log(`       ✓ OK`);
        } catch (err) {
          console.log(`       ✗ Erro: ${err.message}`);
          errorCount++;
        }
      }
    }
  }

  // 5. Resumo
  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  if (DRY_RUN) {
    console.log(`  Total de entradas no CSV: ${rows.length}`);
    console.log(`  Produtos no DB:           ${dbProducts.length} / ${allSkus.length}`);
    console.log(`  Para revisão:             ${paraRevisao.length}`);
    console.log('\n--- DRY RUN. Rode com --execute para aplicar. ---\n');
  } else {
    console.log(`  Imagens enviadas:    ${uploadedCount}`);
    console.log(`  Já existiam (skip):  ${skippedCount}`);
    console.log(`  Erros:               ${errorCount}`);
    console.log(`  Para revisão:        ${paraRevisao.length}`);
  }

  if (paraRevisao.length > 0) {
    console.log('\nPRODUTOS PARA REVISÃO:');
    for (const item of paraRevisao) {
      console.log(`  SKU ${item.sku} | ${item.nome} — ${item.motivo}`);
    }
  }
}

main()
  .catch(e => { console.error('Erro fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
