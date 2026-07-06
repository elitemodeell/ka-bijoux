/**
 * fix-produtos-sem-imagem.js
 *
 * Busca imagens corretas do Bling para os 33 produtos que ficaram sem imagem
 * após a remoção das imagens erradas.
 *
 * Fluxo:
 *  1. OAuth Bling (abre browser, captura code)
 *  2. Para cada produto, busca detalhes no Bling (/Api/v3/produtos/{id})
 *  3. Pega a URL da imagem principal
 *  4. Faz download da imagem
 *  5. Upload para Supabase Storage
 *  6. Cria ProductImage no banco
 *
 * Uso:
 *   NODE_PATH=backend/node_modules node scripts/fix-produtos-sem-imagem.js          # dry-run
 *   NODE_PATH=backend/node_modules node scripts/fix-produtos-sem-imagem.js --execute
 */

const path  = require('path');
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const url   = require('url');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');

const CLIENT_ID     = 'a328177fa4108c47078a0f0eb17395ba29bdd6cb';
const CLIENT_SECRET = '795e2d2d93be82d84a902cd5958ae7f09a97424dfdc513c3ec2be73853f2';
const REDIRECT_URI  = 'http://localhost:3007';

const SUPABASE_PROJECT  = 'sxohqngzypmxtmuulfoa';
const SUPABASE_BASE_URL = `https://${SUPABASE_PROJECT}.supabase.co/storage/v1/object/public/products`;
const BUCKET            = 'products';
const SERVICE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;

const UPLOADS_DIR = path.join(BACKEND_DIR, 'public', 'uploads', 'products');
const IMAGE_FILES_JSON = path.join(BACKEND_DIR, 'data', 'bling-image-files.json');

// Produtos sem imagem: [{ blingId, sku, nome }]
const PRODUTOS = [
  { blingId: '16666276471', sku: '3104000004728', nome: 'ADESIVO BRASIL' },
  { blingId: '16662521375', sku: '3104000004667', nome: 'ALGODÃO DEMAQUILANTE - MIAMAKE' },
  { blingId: '16662524791', sku: '3104000004668', nome: 'BLUSH BOBBI RARA' },
  { blingId: '16665732164', sku: '3104000004689', nome: 'BOTA DE CHUVA PARA TÊNIS' },
  { blingId: '16666284001', sku: '3104000004731', nome: 'BRACELETE DO BRASIL' },
  { blingId: '16666285483', sku: '3104000004732', nome: 'BROCHE DO BRASIL' },
  { blingId: '16666288324', sku: '3104000004733', nome: 'CACHECOL LISO' },
  { blingId: '16666393768', sku: '3104000004762', nome: 'CACHECOL LISO POMPOM' },
  { blingId: '16666400685', sku: '3104000004763', nome: 'CACHECOL XADREZ' },
  { blingId: '16666386904', sku: '3104000004761', nome: 'CACHECOL XADREZ PREMIUM' },
  { blingId: '16663594524', sku: '3104000004685', nome: 'CARIMBO DE FRANCESINHA' },
  { blingId: '16662752361', sku: '3104000004677', nome: 'CESTA DIA DOS NAMORADOS' },
  { blingId: '16662670632', sku: '3104000004675', nome: 'CHINELO DE TIME' },
  { blingId: '16662803847', sku: '3104000004676', nome: 'CHINELO HAVAIANAS BRANCA' },
  { blingId: '16662668538', sku: '3104000004674', nome: 'COLAR COURO COMPRIDO' },
  { blingId: '16666333232', sku: '3104000004734', nome: 'CONJUNTO COLAR + BRINCO BRASIL' },
  { blingId: '16662510546', sku: '3104000004665', nome: 'CREME FACIAL NOTURNO' },
  { blingId: '16662596168', sku: '3104000004673', nome: 'ESCOVA ELETRICA DE DENTE' },
  { blingId: '16662569695', sku: '3104000004672', nome: 'ESCOVA FINALIZADORA PARA CABELO' },
  { blingId: '16666277821', sku: '3104000004729', nome: 'FAIXA BRASIL' },
  { blingId: '16663808241', sku: '3104000004686', nome: 'LAÇO BRASIL' },
  { blingId: '16662528768', sku: '3104000004669', nome: 'ÓLEO HIDRATANTE DE CUTÍCULA' },
  { blingId: '16662565262', sku: '3104000004671', nome: 'PENTE AIRBAG MASSAGE COMB' },
  { blingId: '16662513572', sku: '3104000004666', nome: 'PROGRESSIVA DE CHUVEIRO SACHÊ' },
  { blingId: '16662546311', sku: '3104000004670', nome: 'PULSEIRA CASAL' },
  { blingId: '16666279944', sku: '3104000004730', nome: 'PULSEIRA MISSANGA DO BRASIL' },
  { blingId: '16663860735', sku: '3104000004687', nome: 'PULSEIRA PREMIUM' },
  { blingId: '16663203249', sku: '3104000004681', nome: 'TAPETE ESCORREDOR DE COPOS' },
  { blingId: '16663288574', sku: '3104000004682', nome: 'VALE PRESENTE 100,00' },
  { blingId: '16663291350', sku: '3104000004683', nome: 'VALE PRESENTE 200,00' },
  { blingId: '16663291910', sku: '3104000004684', nome: 'VALE PRESENTE 50,00' },
  { blingId: '16662870496', sku: '3104000004679', nome: 'VASO DECORATIVO 60,00' },
  { blingId: '16662870006', sku: '3104000004678', nome: 'VASO DECORATIVO 72,00' },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

// ── Bling OAuth ────────────────────────────────────────────────────────────────
function startOAuth() {
  return new Promise((resolve, reject) => {
    const STATE = 'kabijoux_fix_' + Date.now();
    const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${STATE}`;

    const server = http.createServer((req, res) => {
      const parsed = new URL(req.url, 'http://localhost:3007');
      const code = parsed.searchParams.get('code');
      if (!code) { res.end('Sem code'); return; }
      res.end('<html><body><h2>Autorizado! Pode fechar esta aba.</h2></body></html>');
      server.close();
      resolve(String(code));
    });

    server.listen(3007, () => {
      console.log('\n🔑 Abrindo autorização do Bling no browser...');
      console.log('   Se não abrir automaticamente, acesse:');
      console.log('  ', authUrl, '\n');
      const { exec } = require('child_process');
      exec(`start "" "${authUrl}"`);
    });
    server.on('error', reject);
  });
}

function exchangeToken(code) {
  return new Promise((resolve, reject) => {
    const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const body = `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    const req = https.request({
      hostname: 'www.bling.com.br',
      path: '/Api/v3/oauth/token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) resolve(json.access_token);
          else reject(new Error('Token não retornado: ' + data));
        } catch { reject(new Error('Resposta inválida: ' + data)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function blingGet(token, endpoint) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'www.bling.com.br',
      path: endpoint,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

// ── Download de imagem ─────────────────────────────────────────────────────────
function downloadImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(imageUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    client.get(imageUrl, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// ── Upload para Supabase ───────────────────────────────────────────────────────
function uploadToSupabase(filename, buffer, contentType = 'image/jpeg') {
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

// ── Extrair URL da imagem da resposta do Bling ────────────────────────────────
// Bling v3 real structure: midia.imagens.{ externas, internas, imagensURL }
function extractImageUrl(productDetail) {
  if (!productDetail) return null;
  const imagens = productDetail?.midia?.imagens;
  if (imagens) {
    if (imagens.externas?.length > 0) return imagens.externas[0].link || imagens.externas[0].url || null;
    if (imagens.internas?.length > 0) return imagens.internas[0].link || imagens.internas[0].url || null;
    if (imagens.imagensURL?.length > 0) return imagens.imagensURL[0] || null;
  }
  return productDetail?.imageUrl || productDetail?.imageThumbnail || null;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== fix-produtos-sem-imagem.js — ${DRY_RUN ? 'DRY RUN' : '*** EXECUÇÃO REAL ***'} ===\n`);

  // Verificar quais realmente estão sem imagem no DB
  const dbProducts = await prisma.product.findMany({
    where: { sku: { in: PRODUTOS.map(p => p.sku) } },
    include: { images: { select: { url: true } } },
  });
  const dbBySku = {};
  for (const p of dbProducts) { if (p.sku) dbBySku[p.sku] = p; }

  const semImagem = PRODUTOS.filter(p => {
    const db = dbBySku[p.sku];
    return !db || db.images.length === 0;
  });

  console.log(`Total para processar: ${semImagem.length} produtos sem imagem\n`);

  if (semImagem.length === 0) {
    console.log('Todos os produtos já têm imagem. Nada a fazer.');
    return;
  }

  if (DRY_RUN) {
    console.log('Produtos que serão processados:');
    semImagem.forEach(p => console.log(`  ${p.sku} | ${p.nome}`));
    console.log('\n--- DRY RUN. Rode com --execute para aplicar. ---\n');
    return;
  }

  // OAuth
  const code = await startOAuth();
  console.log('Code recebido, trocando por token...');
  const token = await exchangeToken(code);
  console.log('Token obtido!\n');

  let ok = 0, semFoto = 0, errors = 0;
  const imageFilesJson = JSON.parse(fs.readFileSync(IMAGE_FILES_JSON, 'utf8'));
  const imageFilesSet = new Set(imageFilesJson);

  for (const produto of semImagem) {
    const dbProduct = dbBySku[produto.sku];
    if (!dbProduct) {
      console.log(`[SKIP] ${produto.sku} — não encontrado no DB`);
      continue;
    }

    console.log(`\n[${produto.sku}] ${produto.nome}`);

    // Buscar detalhes no Bling
    await sleep(300);
    const detail = await blingGet(token, `/Api/v3/produtos/${produto.blingId}`);
    const imageUrl = extractImageUrl(detail?.data);

    if (!imageUrl) {
      console.log(`  [SEM FOTO] Bling não retornou imagem para ${produto.blingId}`);
      semFoto++;
      continue;
    }

    console.log(`  URL Bling: ${imageUrl.slice(0, 80)}...`);

    try {
      // Download
      const buffer = await downloadImage(imageUrl);
      const ext = imageUrl.includes('.png') ? 'png' : 'jpg';
      const slug = slugify(produto.nome);
      const filename = `correto-${slug}-${produto.sku}-01.${ext}`;

      // Salvar local
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

      // Upload Supabase
      const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const supaUrl = await uploadToSupabase(filename, buffer, contentType);
      console.log(`  Supabase: ${filename}`);

      // Criar ProductImage no DB
      await prisma.productImage.create({
        data: {
          url: supaUrl,
          alt: produto.nome,
          order: 0,
          productId: dbProduct.id,
        },
      });

      // Atualizar bling-image-files.json
      if (!imageFilesSet.has(filename)) {
        imageFilesSet.add(filename);
      }

      console.log(`  ✓ OK`);
      ok++;
    } catch (err) {
      console.log(`  ✗ Erro: ${err.message}`);
      errors++;
    }
  }

  // Salvar bling-image-files.json atualizado
  if (ok > 0) {
    fs.writeFileSync(IMAGE_FILES_JSON, JSON.stringify([...imageFilesSet].sort(), null, 2), 'utf8');
    console.log(`\nbling-image-files.json atualizado.`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  console.log(`  Imagens importadas: ${ok}`);
  console.log(`  Sem foto no Bling:  ${semFoto}`);
  console.log(`  Erros:              ${errors}`);
}

main()
  .catch(e => { console.error('Erro fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
