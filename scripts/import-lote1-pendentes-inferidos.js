/**
 * import-lote1-pendentes-inferidos.js
 *
 * Dos 106 pendentes da fase 2, importa os 21 que têm SKU inferível
 * por timestamp (mesmo segundo que uma imagem aplicada com SKU único).
 * Os outros 85 ambíguos são salvos em lote1-para-revisao.txt.
 *
 * Uso:
 *   NODE_PATH=backend/node_modules node scripts/import-lote1-pendentes-inferidos.js          # dry-run
 *   NODE_PATH=backend/node_modules node scripts/import-lote1-pendentes-inferidos.js --execute
 */

const path  = require('path');
const fs    = require('fs');
const https = require('https');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');

const APPLIED_CSV    = 'C:/Users/bruno/Downloads/produto lote 1/produto lote 1 - aplicadas fase 2/lista-das-65-aplicadas.csv';
const PENDENTES_CSV  = 'C:/Users/bruno/Downloads/produto lote 1/produto lote 1 - pendentes revisao fase 2/lista-das-106-pendentes.csv';
const PENDENTES_DIR  = 'C:/Users/bruno/Downloads/produto lote 1/produto lote 1 - pendentes revisao fase 2';
const UPLOADS_DIR    = path.join(BACKEND_DIR, 'public', 'uploads', 'products');
const REVISAO_OUTPUT = 'C:/Users/bruno/Downloads/lote1-pendentes-para-revisao.txt';

const SUPABASE_PROJECT  = 'sxohqngzypmxtmuulfoa';
const SUPABASE_BASE_URL = `https://${SUPABASE_PROJECT}.supabase.co/storage/v1/object/public/products`;
const BUCKET            = 'products';
const SERVICE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim());
  const headers = lines[0].split(';');
  return lines.slice(1).map(l => {
    const cols = l.split(';');
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (cols[i] || '').trim(); });
    return obj;
  });
}

function getTimeKey(filename) {
  const m = filename.match(/(\d\d_\d\d_\d\d)/);
  return m ? m[1] : '';
}

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function uploadToSupabase(filename, fileBuffer) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${SUPABASE_PROJECT}.supabase.co`,
      path: `/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`,
      method: 'POST',
      headers: {
        'apikey':         SERVICE_KEY,
        'Authorization':  `Bearer ${SERVICE_KEY}`,
        'Content-Type':   'image/png',
        'Content-Length': fileBuffer.length,
        'x-upsert':       'true',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) resolve(`${SUPABASE_BASE_URL}/${filename}`);
        else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

function findSourceFile(filename) {
  const direct = path.join(PENDENTES_DIR, filename);
  if (fs.existsSync(direct)) return direct;
  const files = fs.readdirSync(PENDENTES_DIR);
  const match = files.find(f => f.includes(filename));
  if (match) return path.join(PENDENTES_DIR, match);
  return null;
}

async function main() {
  console.log(`\n=== import-lote1-pendentes-inferidos.js — ${DRY_RUN ? 'DRY RUN' : '*** EXECUÇÃO REAL ***'} ===\n`);

  // 1. Ler CSVs
  const applied   = parseCsv(APPLIED_CSV);
  const pendentes = parseCsv(PENDENTES_CSV);

  // 2. Inferir SKU para cada pendente por timestamp
  const matched   = [];
  const ambiguous = [];

  for (const p of pendentes) {
    const t = getTimeKey(p.sourceFile);
    const same = applied.filter(a => getTimeKey(a.sourceFile) === t);
    const skus = [...new Set(same.map(a => a.sku))];
    if (skus.length === 1) {
      matched.push({ file: p.sourceFile, sku: skus[0], nome: same[0].blingName });
    } else {
      ambiguous.push({ file: p.sourceFile, reason: skus.length === 0 ? 'Sem match de timestamp' : `Ambíguo: ${skus.join(', ')}` });
    }
  }

  console.log(`Total pendentes: ${pendentes.length}`);
  console.log(`  Inferíveis por timestamp: ${matched.length}`);
  console.log(`  Ambíguos (para revisão):  ${ambiguous.length}\n`);

  // 3. Buscar produtos no DB para os SKUs inferidos
  const inferredSkus = [...new Set(matched.map(m => m.sku))];
  const dbProducts = await prisma.product.findMany({
    where: { sku: { in: inferredSkus } },
    include: { images: { select: { url: true, order: true } } },
  });
  const dbBySku = {};
  for (const p of dbProducts) {
    if (p.sku) dbBySku[p.sku] = p;
  }

  // 4. Por SKU, processar imagens inferidas
  // Agrupar matched por SKU
  const bySku = {};
  for (const m of matched) {
    if (!bySku[m.sku]) bySku[m.sku] = [];
    bySku[m.sku].push(m);
  }

  let uploadedCount = 0;
  let errorCount = 0;

  for (const sku of Object.keys(bySku)) {
    const items     = bySku[sku];
    const dbProduct = dbBySku[sku];
    const nome      = items[0].nome;

    console.log(`\n--- ${sku} | ${nome} (${items.length} imgs inferidas) ---`);

    if (!dbProduct) {
      console.log(`  [AVISO] Produto não encontrado no DB — movendo para revisão`);
      ambiguous.push(...items.map(m => ({ file: m.file, reason: `Produto ${sku} não encontrado no DB` })));
      continue;
    }

    const existingUrls = new Set(dbProduct.images.map(i => i.url));
    const nextOrder = dbProduct.images.length;

    for (let i = 0; i < items.length; i++) {
      const { file: srcFilename } = items[i];
      const destName = `inferido-${slugify(nome)}-${sku}-${String(nextOrder + i + 1).padStart(2, '0')}.png`;
      const supaUrl  = `${SUPABASE_BASE_URL}/${destName}`;

      if (existingUrls.has(supaUrl)) {
        console.log(`  [skip] Já existe: ${destName}`);
        continue;
      }

      const srcPath = findSourceFile(srcFilename);
      if (!srcPath) {
        console.log(`  [ERRO] Arquivo não encontrado: ${srcFilename}`);
        errorCount++;
        continue;
      }

      console.log(`  [${String(i + 1).padStart(2, '0')}] ${destName}`);

      if (!DRY_RUN) {
        try {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
          const destLocal = path.join(UPLOADS_DIR, destName);
          fs.copyFileSync(srcPath, destLocal);
          const buf = fs.readFileSync(destLocal);
          await uploadToSupabase(destName, buf);
          await prisma.productImage.create({
            data: { url: supaUrl, alt: nome, order: nextOrder + i, productId: dbProduct.id },
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

  // 5. Salvar lista de revisão
  const revisaoLines = [
    'LOTE 1 — PENDENTES PARA REVISÃO MANUAL',
    '========================================',
    `Total: ${ambiguous.length} imagens precisam ser identificadas manualmente.`,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
    'Para adicionar: abra cada imagem, identifique o produto e adicione pelo painel admin.',
    'As imagens estão em:',
    '  C:\\Users\\bruno\\Downloads\\produto lote 1\\produto lote 1 - pendentes revisao fase 2\\',
    '',
    ...ambiguous.map((a, idx) => `${String(idx + 1).padStart(3, '0')}. ${a.file}\n     Motivo: ${a.reason}`),
    '',
  ];
  fs.writeFileSync(REVISAO_OUTPUT, revisaoLines.join('\n'), 'utf8');
  console.log(`\nLista de revisão salva em: ${REVISAO_OUTPUT}`);

  // 6. Resumo
  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  if (DRY_RUN) {
    console.log(`  Imagens a importar:  ${matched.length}`);
    console.log(`  Para revisão manual: ${ambiguous.length}`);
    console.log('\n--- DRY RUN. Rode com --execute para aplicar. ---\n');
  } else {
    console.log(`  Imagens importadas:  ${uploadedCount}`);
    console.log(`  Erros:               ${errorCount}`);
    console.log(`  Para revisão manual: ${ambiguous.length}`);
  }
}

main()
  .catch(e => { console.error('Erro fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
