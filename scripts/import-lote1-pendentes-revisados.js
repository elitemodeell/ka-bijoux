/**
 * import-lote1-pendentes-revisados.js
 *
 * Importa as imagens dos 85 pendentes ambíguos do lote 1 que foram
 * revisadas visualmente e identificadas com seus SKUs no Bling.
 * Cria produtos no DB quando necessário (a partir de produtos-bling.json).
 * Itens sem SKU identificado são salvos no arquivo de revisão manual.
 *
 * Uso:
 *   NODE_PATH=backend/node_modules node scripts/import-lote1-pendentes-revisados.js          # dry-run
 *   NODE_PATH=backend/node_modules node scripts/import-lote1-pendentes-revisados.js --execute
 */

const path  = require('path');
const fs    = require('fs');
const https = require('https');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');

const PENDENTES_CSV   = 'C:/Users/bruno/Downloads/produto lote 1/produto lote 1 - pendentes revisao fase 2/lista-das-106-pendentes.csv';
const PENDENTES_DIR   = 'C:/Users/bruno/Downloads/produto lote 1/produto lote 1 - pendentes revisao fase 2';
const UPLOADS_DIR     = path.join(BACKEND_DIR, 'public', 'uploads', 'products');
const BLING_JSON      = path.join(BACKEND_DIR, 'data', 'produtos-bling.json');
const REVISAO_OUTPUT  = 'C:/Users/bruno/Downloads/lote1-pendentes-sem-bling.txt';

const SUPABASE_PROJECT  = 'sxohqngzypmxtmuulfoa';
const SUPABASE_BASE_URL = `https://${SUPABASE_PROJECT}.supabase.co/storage/v1/object/public/products`;
const BUCKET            = 'products';
const SERVICE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Mapeamento item# → SKU (resultado da revisão visual) ────────────────────
const ITEM_TO_SKU = {
  '23':  '3104000000462', // Espelho de Mesa com Gavetas
  '31':  '3104000000462', // Espelho de Mesa Gatinho
  '32':  '3104000000462', // Espelho Flor de Mesa
  '18':  '3104000000481', // Escova Dedeira para Pets
  '24':  '3104000004359', // Catnip para Gatos
  '63':  '3104000003766', // La Bella Deo Colônia SIS
  '95':  '3104000003767', // Lady Billion Deo Colônia SIS
  '67':  '3104000000611', // Carregador Rápido Q'Gold 40W
  '73':  '3104000003340', // Kit USB-C 60W (Q'Gold)
  '74':  '3104000003347', // Carregador Rápido 3.1A V8/Type-C
  '75':  '3104000003346', // Carregadores múltiplos modelos
  '76':  '3104000003346', // Carregador 3 USB
  '78':  '3104000004339', // Cabo USB-C 60W
  '79':  '3104000000162', // Cabo Micro USB 1m
  '81':  '3104000004340', // Cabos Lightning e Type-C
  '85':  '3104000003346', // Kit Carregador Tipo-C 5.1A QGOLD
  '86':  '3104000003340', // Kit Carregador iOS 5.1A QGOLD
  '90':  '3104000001015', // Organizador Multiuso 28 slots
  '94':  '3104000005820', // Caixa de Som + Microfone Rosa
  '108': '3104000001380', // Mini Karaokê Portátil
  '109': '3104000005824', // Microfone Karaokê standalone
  '105': '3104000001146', // Protetor de Calcanhar Adesivo
  '106': '3104000001148', // Protetor de Silicone Planta do Pé
  '128': '3104000003115', // Aero Glitter 3 em 1
  '129': '3104000000064', // Protetor de Mamilo Silicone
  '137': '3104000005817', // Luminária 3D Coração
  '139': '3104000001384', // Luminária 3D LED genérica
  '219': '3104000005818', // Luminária 3D Criativa
  '225': '3104000001749', // Lâmpada LED com Alto-Falante
  '175': '3104000005307', // Pulseira Dourada Cartier-style
  '176': '3104000005307', // Pulseira Dourada Marcante
  '178': '3104000005380', // Pulseira Dourada Strass Black
  '180': '3104000000752', // Pulseira com Cabo Metálico
  '186': '3104000000749', // Pulseira Dourada Delicada bolinhas
  '213': '3104000005380', // Pulseira Shine Aço Inox Zircônias
  '199': '3104000005384', // Pulseira Pedra Turquesa Dourada Oval
  '200': '3104000005383', // Pulseira Pedra Turquesa Prata Oval
  '201': '3104000005385', // Pulseira Pedra Turquesa Prata Redonda
  '215': '3104000005382', // Pulseira Turquesa Pedras Naturais Banho Dourado
  '182': '3104000000511', // Colar Prateado com Pingente
  '183': '3104000000739', // Colar Coração Vazado Dourado
  '184': '3104000000750', // Colar Coração Geométrico Dourado
  '185': '3104000005229', // Colar Coração Dourado relicário
  '189': '3104000000511', // Colar Coração Geométrico Prata
  '190': '3104000000750', // Colar Pingente Redondo Dourado
  '191': '3104000000511', // Colar Coração Delicado Prata
  '194': '3104000000517', // Choker Brilho Rosa
  '195': '3104000005351', // Mix Colares Dourado
  '196': '3104000005352', // Colar Prateado Moderno
  '197': '3104000005349', // Colar Riviera Brilho Prata
  '198': '3104000005351', // Mix Colares Delicado Moderno
  '202': '3104000005233', // Relicário Coração Prata aberto
  '203': '3104000005052', // Relicário Redondo Dourado aberto
  '204': '3104000005052', // Pingente Redondo Dourado fechado
  '205': '3104000005232', // Relicário Coração Prata fechado
  '206': '3104000005232', // Coração Geométrico Prata
  '207': '3104000005563', // Anéis para Cabelo Dourado
};

// Mapeamento SKU → categoria do DB
const SKU_CATEGORY = {
  '3104000000481': 'cat-pet',         // ESCOVA SILICONE PET
  '3104000004359': 'cat-pet',         // BRINQUEDO ABACATE COM CATNIP PARA PET
  '3104000000611': 'cat-utilidades',  // FONTE USB
  '3104000003340': 'cat-utilidades',  // FONTE + CABO TIPO-C 2 ENTRADAS
  '3104000003347': 'cat-utilidades',  // FONTE + CABO V8-MICRO 3ENTRADAS
  '3104000003346': 'cat-utilidades',  // FONTE + CABO TIPO-C 3 ENTRADAS
  '3104000001015': 'cat-utilidades',  // ORGANIZADOR MULTIUSO SIMPLES
  '3104000005820': 'cat-utilidades',  // CAIXA DE SOM + MICROFONE ROSA
  '3104000001148': 'cat-utilidades',  // PROTETOR DE SILICONE PLANTA DO PE
  '3104000001380': 'cat-utilidades',  // CAIXA DE SOM + MICROFONE
  '3104000005824': 'cat-utilidades',  // MICROFONE C/BLUETOOTH
  '3104000003115': 'cat-maquiagem',   // SPRAY GLITTER
  '3104000001384': 'cat-utilidades',  // LUMINARIA LED P/ESCREVER
  '3104000005380': 'cat-bijuterias',  // BRACELETE AÇO INOX CARTIER C/ STRASS PRATA
  '3104000000752': 'cat-bijuterias',  // PULSEIRA DE AÇO
  '3104000000511': 'cat-bijuterias',  // COLAR
  '3104000000739': 'cat-bijuterias',  // COLAR ARO
  '3104000000750': 'cat-bijuterias',  // COLAR PREMIUM
  '3104000005229': 'cat-bijuterias',  // RELICARIO CORAÇÃO FECHADO DOURADO
  '3104000000749': 'cat-bijuterias',  // PULSEIRA
  '3104000000517': 'cat-bijuterias',  // CHOKER PREMIUM
  '3104000005349': 'cat-bijuterias',  // COLAR RIVIERA PRATA M
  '3104000005383': 'cat-bijuterias',  // PULSEIRA PEDRA TURQUESA PRATA OVAL
  '3104000005385': 'cat-bijuterias',  // PULSEIRA PEDRA TURQUESA PRATA REDONDA
  '3104000005232': 'cat-bijuterias',  // RELICARIO CORAÇÃO TRIANGULO PRATA
  '3104000005563': 'cat-acessorios-cabelo', // ANEL DE CABELO G DOURADO
  '3104000005382': 'cat-bijuterias',  // PULSEIRA PEDRA TURQUESA DOURADA REDONDA
  '3104000005818': 'cat-utilidades',  // LUMINARIA LED P/ESCREVER QUADRADO
  '3104000001749': 'cat-utilidades',  // LAMPADA LED COM CONTROLE
};

// Descrições para itens sem Bling
const ITEM_DESCRICAO = {
  '1':   'Ninho para Bebê com Mosquiteiro',
  '3':   'Colchonete Infantil Portátil',
  '54':  'Organizador com Bolsos 12 compartimentos',
  '55':  'Organizador de Calçados 4 níveis',
  '56':  'Fone de Ouvido com Fio',
  '64':  'Fone de Ouvido com Fio',
  '72':  'Fone de Ouvido com Fio',
  '87':  'Fone de Ouvido com Fio',
  '110': 'Organizador para Sapatos de Viagem',
  '111': 'Coleção Perfume SIS 45ml (múltiplas fragrâncias)',
  '112': 'Organizador Multiuso de Viagem',
  '114': 'Kit Organizador de Mala (cubos)',
  '115': 'Kit Organizador de Mala (cubos)',
  '116': 'Kit Organizador de Mala (cubos)',
  '117': 'Kit Organizador de Mala (cubos)',
  '131': 'Kit Frascos de Viagem (Smart Travel Bottles)',
  '133': 'Acessório com Base de Strass',
  '140': 'Capa com Alça para Celular',
  '141': 'Capa com Cordão Brilhante',
  '143': 'Elásticos de Cabelo Pretos',
  '153': 'Relógio Digital Retrô (Casio-style)',
  '154': 'Relógio Digital Retrô (Casio-style)',
  '155': 'Relógio Digital Retrô (Casio-style)',
  '158': 'Relógio Feminino Analógico',
  '159': 'Relógio Feminino Analógico',
  '160': 'Relógio Feminino Analógico',
  '168': 'Regata Modeladora com Zíper',
  '172': 'Regata Modeladora com Zíper',
  '217': 'Aspirador Portátil Sem Fio',
  '230': 'Sunset Lamp LED',
  '240': 'Arquivo não encontrado no disco',
  '241': 'Arquivo não encontrado no disco',
  '242': 'Arquivo não encontrado no disco',
  '243': 'Arquivo não encontrado no disco',
  '244': 'Arquivo não encontrado no disco',
};

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

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function findSourceFile(itemNum, sourceFilename) {
  const prefix = String(itemNum).padStart(3, '0') + '__PENDENTE_REVISAO__';
  const direct = path.join(PENDENTES_DIR, prefix + sourceFilename);
  if (fs.existsSync(direct)) return direct;
  const files = fs.readdirSync(PENDENTES_DIR);
  const match = files.find(f => f.startsWith(prefix));
  if (match) return path.join(PENDENTES_DIR, match);
  return null;
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

async function ensureProductInDb(sku, blingBySku) {
  const existing = await prisma.product.findFirst({ where: { sku }, include: { images: { select: { url: true, order: true } } } });
  if (existing) return existing;

  const blingProduct = blingBySku[sku];
  if (!blingProduct) return null;

  const categoryId = SKU_CATEGORY[sku] || 'cat-utilidades';
  const nome = blingProduct.nome || sku;

  const created = await prisma.product.create({
    data: {
      name:              nome,
      slug:              slugify(nome) + '-' + sku.slice(-6),
      description:       nome,
      price:             String(blingProduct.preco || 0),
      stock:             parseInt(blingProduct.estoque) || 0,
      minStock:          2,
      weight:            '0.1',
      height:            '1',
      width:             '1',
      length:            '1',
      active:            true,
      sku:               sku,
      importSource:      'MANUAL',
      enrichmentStatus:  'PENDING_RESEARCH',
      publicationStatus: 'IMPORTED',
      categoryId,
    },
    include: { images: { select: { url: true, order: true } } },
  });

  return created;
}

async function main() {
  console.log(`\n=== import-lote1-pendentes-revisados.js — ${DRY_RUN ? 'DRY RUN' : '*** EXECUÇÃO REAL ***'} ===\n`);

  const pendentes = parseCsv(PENDENTES_CSV);
  const blingAll  = JSON.parse(fs.readFileSync(BLING_JSON, 'utf8'));
  const blingBySku = {};
  for (const p of blingAll) { if (p.codigo) blingBySku[p.codigo] = p; }

  console.log(`Total no CSV: ${pendentes.length} itens`);

  const comSku = pendentes.filter(p => ITEM_TO_SKU[p.item]);
  const semSku = pendentes.filter(p => !ITEM_TO_SKU[p.item]);
  console.log(`  Com SKU identificado: ${comSku.length}`);
  console.log(`  Sem SKU (para revisão): ${semSku.length}\n`);

  const allSkus = [...new Set(comSku.map(p => ITEM_TO_SKU[p.item]))];

  // Buscar produtos no DB; criar os que faltam
  const dbBySku = {};
  for (const sku of allSkus) {
    const existing = await prisma.product.findFirst({
      where: { sku },
      include: { images: { select: { url: true, order: true } } },
    });
    if (existing) {
      dbBySku[sku] = existing;
    } else {
      const blingProduct = blingBySku[sku];
      if (!blingProduct) {
        console.log(`  [AVISO] SKU ${sku} não encontrado no Bling JSON — será ignorado`);
      } else {
        console.log(`  [CRIAR] SKU ${sku} — ${blingProduct.nome}`);
        if (!DRY_RUN) {
          const created = await ensureProductInDb(sku, blingBySku);
          if (created) dbBySku[sku] = created;
        }
      }
    }
  }

  const emDb    = Object.keys(dbBySku).length;
  const naoEmDb = allSkus.filter(s => !dbBySku[s]).length;
  console.log(`\nProdutos no DB: ${emDb} / ${allSkus.length} (${naoEmDb} serão criados${DRY_RUN ? ' no --execute' : ''})\n`);

  // Agrupar por SKU
  const bySku = {};
  for (const p of comSku) {
    const sku = ITEM_TO_SKU[p.item];
    if (!bySku[sku]) bySku[sku] = [];
    bySku[sku].push(p);
  }

  let uploadedCount = 0;
  let skippedCount  = 0;
  let errorCount    = 0;
  const paraRevisao = [];

  for (const sku of Object.keys(bySku)) {
    const items     = bySku[sku];
    const dbProduct = dbBySku[sku];

    if (!dbProduct) {
      if (!DRY_RUN) {
        for (const item of items) {
          paraRevisao.push({ item: item.item, file: item.sourceFile, reason: `SKU ${sku} não pôde ser criado no DB` });
        }
      }
      continue;
    }

    console.log(`\n--- SKU ${sku} | ${dbProduct.name} (${items.length} img(s)) ---`);

    const existingUrls = new Set(dbProduct.images.map(i => i.url));
    const nextOrder = dbProduct.images.length;

    for (let i = 0; i < items.length; i++) {
      const csvItem  = items[i];
      const srcPath  = findSourceFile(csvItem.item, csvItem.sourceFile);
      const destName = `revisado-${slugify(dbProduct.name)}-${sku}-${String(nextOrder + i + 1).padStart(2, '0')}.png`;
      const supaUrl  = `${SUPABASE_BASE_URL}/${destName}`;

      if (existingUrls.has(supaUrl)) {
        console.log(`  [skip] Já existe: ${destName}`);
        skippedCount++;
        continue;
      }

      if (!srcPath) {
        console.log(`  [ERRO] Arquivo não encontrado para item ${csvItem.item}`);
        paraRevisao.push({ item: csvItem.item, file: csvItem.sourceFile, reason: 'Arquivo não encontrado na pasta' });
        errorCount++;
        continue;
      }

      console.log(`  [${String(i + 1).padStart(2, '0')}] item ${csvItem.item} → ${destName}`);

      if (!DRY_RUN) {
        try {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
          const destLocal = path.join(UPLOADS_DIR, destName);
          fs.copyFileSync(srcPath, destLocal);
          const buf = fs.readFileSync(destLocal);
          await uploadToSupabase(destName, buf);
          await prisma.productImage.create({
            data: { url: supaUrl, alt: dbProduct.name, order: nextOrder + i, productId: dbProduct.id },
          });
          uploadedCount++;
          console.log(`       ✓ OK`);
        } catch (err) {
          console.log(`       ✗ Erro: ${err.message}`);
          paraRevisao.push({ item: csvItem.item, file: csvItem.sourceFile, reason: `Erro de upload: ${err.message}` });
          errorCount++;
        }
      }
    }
  }

  // Itens sem SKU → revisão
  for (const p of semSku) {
    const descricao = ITEM_DESCRICAO[p.item] || 'Não identificado visualmente';
    paraRevisao.push({ item: p.item, file: p.sourceFile, reason: `Sem SKU no Bling — ${descricao}` });
  }

  // Salvar revisão
  const lines = [
    'LOTE 1 — ITENS SEM PRODUTO NO BLING (REVISÃO MANUAL)',
    '=====================================================',
    `Total: ${paraRevisao.length} imagens não importadas`,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
    'Para adicionar: identifique o produto correto no Bling e adicione pelo painel admin.',
    'As imagens estão em:',
    '  C:\\Users\\bruno\\Downloads\\produto lote 1\\produto lote 1 - pendentes revisao fase 2\\',
    '',
    ...paraRevisao.map((r, idx) => [
      `${String(idx + 1).padStart(3, '0')}. Item ${String(r.item).padStart(3, ' ')} — ${r.file}`,
      `     Motivo: ${r.reason}`,
    ].join('\n')),
    '',
  ];
  fs.writeFileSync(REVISAO_OUTPUT, lines.join('\n'), 'utf8');
  console.log(`\nArquivo de revisão salvo em: ${REVISAO_OUTPUT}`);

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  if (DRY_RUN) {
    console.log(`  Com SKU identificado:   ${comSku.length} imagens`);
    console.log(`  Sem SKU (para revisão): ${semSku.length} imagens`);
    console.log(`  SKUs únicos:            ${allSkus.length}`);
    console.log(`  Já no DB:               ${emDb}`);
    console.log(`  A criar no DB:          ${naoEmDb}`);
    console.log('\n--- DRY RUN. Rode com --execute para aplicar. ---\n');
  } else {
    console.log(`  Imagens importadas:  ${uploadedCount}`);
    console.log(`  Já existiam (skip):  ${skippedCount}`);
    console.log(`  Erros:               ${errorCount}`);
    console.log(`  Para revisão manual: ${paraRevisao.length}`);
  }
}

main()
  .catch(e => { console.error('Erro fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
