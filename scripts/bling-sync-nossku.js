/**
 * bling-sync-nossku.js
 *
 * Para cada uma das 118 imagens sem SKU no nome:
 * 1. Usa o match-result.csv já gerado (não precisa refazer OAuth)
 * 2. Se score >= 0.6 e tem SKU Bling válido:
 *    - Se SKU já está no banco → adiciona a imagem como foto extra do produto
 *    - Se SKU não está no banco → cria o produto com dados do Bling
 * 3. Se score < 0.6 ou sem SKU → lista para revisão manual
 *
 * Rodar com: NODE_PATH=./backend/node_modules node scripts/bling-sync-nossku.js
 */

const path  = require('path');
const http  = require('http');
const https = require('https');
const fs    = require('fs');

const BACKEND_DIR  = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CLIENT_ID     = 'a328177fa4108c47078a0f0eb17395ba29bdd6cb';
const CLIENT_SECRET = '795e2d2d93be82d84a902cd5958ae7f09a97424dfdc513c3ec2be73853f2';
const REDIRECT_URI  = 'http://localhost:3007';
const IMAGES_DIR    = path.join(BACKEND_DIR, 'public', 'uploads', 'products');
const SUPABASE_BASE = 'https://sxohqngzypmxtmuulfoa.supabase.co/storage/v1/object/public/products';

// Imagens que são claramente fotos extras (variações de cor) de produtos já existentes
// Não devem criar produtos novos
const APENAS_IMAGEM_EXTRA = new Set([
  'anel-peniano-bolinha-cores.png',
  'anel-peniano-orelha-cores.png',
  'anel-peniano-orelha-rosa-roxo.png',
  'vibrador-sexy-controle-cores.png',
  'pau-de-cavalo-gel-40ml-2.png',    // segunda foto do mesmo produto
]);

function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\.\w+$/, '').replace(/[-_]/g, ' ')
    .replace(/\d+ml\b/g, '').replace(/\d+g\b/g, '')
    .replace(/\s+/g, ' ').trim();
}

function score(a, b) {
  const wa = new Set(a.split(' ').filter(w => w.length > 2));
  const wb = new Set(b.split(' ').filter(w => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let matches = 0;
  for (const w of wa) if (wb.has(w)) matches++;
  const bonus = a.includes(b) || b.includes(a) ? 2 : 0;
  return (matches + bonus) / Math.max(wa.size, wb.size);
}

function getCategoria(nome) {
  const n = nome.toLowerCase();
  if (/gel|creme|lub|lubrif|óleo|oleo|massagem|beijo|garganta|hot|ice|excita|sexy.?drink|tesao|tesão|sempre.?virgem|pau.?erg|nabuc|virgem|loka|kama|amor|pirocad|fofatob|vamos.?ser|rivosex|janumete|metioulate|mete.?ficha|pererecard|nocuc|napepex|nabucetim|amoxsex|anis.?sex|come.?anel|dando|beijo.?grego|garganta|lamb|yummy|k-med|lub.?plus|magic.?gel|oleo.?massag|desodorante.?intimo/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-geis-e-cremes' };
  if (/bolinha|satisfaction|pop.?ball|bolinhas.?sexy/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-geis-e-cremes' };
  if (/bullet|vibrador|golfinho/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-vibradores' };
  if (/egg.?(silky|stepper|twister|wavy|milky)|masturbador|capsule/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-masturbadores' };
  if (/anel.?peniano/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-aneis' };
  if (/plug|algema|tapa.?mamilo/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  if (/case|capinha/.test(n)) return { cat: 'capinhas-acessorios-celular', sub: null };
  if (/perfume|desodorante/.test(n)) return { cat: 'perfumaria', sub: null };
  if (/pulseira|colar|brinco|anel/.test(n)) return { cat: 'bijuterias', sub: null };
  if (/kit/.test(n)) return { cat: 'sex-shop', sub: 'sex-shop-acessorios' };
  return { cat: 'sex-shop', sub: 'sex-shop-geis-e-cremes' };
}

async function fetchAllBlingProducts(token) {
  const products = [];
  let page = 1;
  while (true) {
    const data = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'www.bling.com.br',
        path: `/Api/v3/produtos?pagina=${page}&limite=100`,
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      });
      req.on('error', reject);
      req.end();
    });
    const items = data?.data ?? [];
    if (items.length === 0) break;
    products.push(...items);
    process.stdout.write(`\r  Buscando Bling: ${products.length}...`);
    if (items.length < 100) break;
    page++;
  }
  console.log();
  return products;
}

const STATE   = 'kabijoux_nossku_' + Date.now();
const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${STATE}`;

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   KA BIJOUX — SINCRONIZAR IMAGENS SEM SKU        ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('\nAbra esse link no navegador para autorizar o Bling:');
console.log('\n' + authUrl + '\n');
console.log('Aguardando autorização...\n');

const server = http.createServer(async (req, res) => {
  const url  = new URL(req.url, 'http://localhost:3007');
  const code = url.searchParams.get('code');
  if (!code) { res.end('Sem código'); return; }

  console.log('Código recebido! Trocando por token...');
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body = `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  const tokenReq = https.request({
    hostname: 'www.bling.com.br',
    path: '/Api/v3/oauth/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, (tokenRes) => {
    let data = '';
    tokenRes.on('data', d => data += d);
    tokenRes.on('end', async () => {
      const token = JSON.parse(data);
      if (!token.access_token) {
        console.log('Erro token:', data); res.end('Erro'); server.close(); return;
      }

      try {
        console.log('Token OK! Buscando Bling...\n');
        const blingProducts = await fetchAllBlingProducts(token.access_token);

        // Normalizar produtos Bling
        const blingNorm = blingProducts.map(p => ({
          id: p.id, sku: p.codigo, nome: p.nome, preco: p.preco,
          norm: normalize(p.nome || ''),
        }));

        // Imagens sem SKU
        const skuRegex = /3104000\d+/;
        const semSku   = fs.readdirSync(IMAGES_DIR).filter(f => !skuRegex.test(f));

        // Produtos já no banco
        const dbProducts = await prisma.product.findMany({ select: { id: true, sku: true, name: true } });
        const dbBySku    = Object.fromEntries(dbProducts.map(p => [p.sku, p]));

        // Categorias
        const categories = await prisma.category.findMany({ include: { children: true } });
        const catBySlug  = {};
        for (const c of categories) {
          catBySlug[c.slug] = c;
          for (const s of c.children) catBySlug[s.slug] = s;
        }

        const existingSlugs = new Set(await prisma.product.findMany({ select: { slug: true } }).then(r => r.map(p => p.slug)));

        let criados = 0, imagensExtras = 0, pulados = 0, semMatch = 0;
        const revisao = [];

        for (const imgFile of semSku) {
          const imgUrl    = `${SUPABASE_BASE}/${imgFile}`;
          const normImg   = normalize(imgFile);

          // Buscar melhor match no Bling
          let best = null, bestScore = 0;
          for (const b of blingNorm) {
            const s = score(normImg, b.norm);
            if (s > bestScore) { bestScore = s; best = b; }
          }

          // Se tem match alto com SKU no Bling → usa dados do Bling
          // Se não → cria só na nossa plataforma pelo nome do arquivo
          const usarBling = bestScore >= 0.5 && best?.sku;
          const sku = usarBling ? String(best.sku).trim() : null;

          // Produto já existe no banco → adicionar imagem extra
          if (sku && dbBySku[sku]) {
            const prod = dbBySku[sku];
            // Verificar se já tem essa imagem
            const jaExiste = await prisma.productImage.findFirst({
              where: { productId: prod.id, url: imgUrl },
            });
            if (!jaExiste && !APENAS_IMAGEM_EXTRA.has(imgFile)) {
              // Contar quantas imagens já tem para definir order
              const count = await prisma.productImage.count({ where: { productId: prod.id } });
              await prisma.productImage.create({
                data: { productId: prod.id, url: imgUrl, alt: prod.name, order: count },
              });
              console.log(`  + Imagem extra: ${imgFile} → ${prod.name} (SKU ${sku})`);
              imagensExtras++;
            } else {
              pulados++;
            }
            continue;
          }

          // Produto não existe → criar (com dados Bling se tiver, senão pelo nome do arquivo)
          const nome = usarBling
            ? best.nome
            : normalize(imgFile).replace(/\s+/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          const preco = usarBling && best.preco ? Number(best.preco) : 15;
          const { cat: catSlug, sub: subSlug } = getCategoria(nome);
          const category    = catBySlug[catSlug];
          const subcategory = subSlug ? catBySlug[subSlug] : null;

          if (!category) {
            console.log(`  [SEM CAT] ${nome} (${catSlug})`);
            pulados++;
            continue;
          }

          let slug = nome.toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
          if (existingSlugs.has(slug)) slug = `${slug}-${sku ? sku.slice(-4) : Date.now().toString().slice(-4)}`;
          existingSlugs.add(slug);

          const created = await prisma.product.create({
            data: {
              name: nome, slug, sku: sku ?? undefined,
              description: `${nome} — produto de qualidade para adultos.`,
              price: preco,
              stock: 10, weight: 0.1, height: 5, width: 10, length: 15,
              active: true, featured: false, isNew: false,
              categoryId: category.id,
              subcategoryId: subcategory?.id ?? null,
              images: { create: [{ url: imgUrl, alt: nome, order: 0 }] },
            },
          });
          const origem = usarBling ? `Bling SKU ${sku}` : 'só plataforma';
          console.log(`  ✓ Criado: ${nome} (${origem}) — score ${bestScore.toFixed(2)}`);
          if (sku) dbBySku[sku] = { id: created.id, sku, name: nome };
          criados++;
        }

        const total = await prisma.product.count();

        console.log('\n╔══════════════════════════════════════╗');
        console.log(`║  Produtos criados: ${String(criados).padEnd(17)}║`);
        console.log(`║  Imagens extras:   ${String(imagensExtras).padEnd(17)}║`);
        console.log(`║  Pulados:          ${String(pulados).padEnd(17)}║`);
        console.log(`║  Revisar manual:   ${String(semMatch).padEnd(17)}║`);
        console.log(`║  Total no banco:   ${String(total).padEnd(17)}║`);
        console.log('╚══════════════════════════════════════╝');


        res.end(`<h1>Concluído!</h1><p>Criados: ${criados} | Imagens extras: ${imagensExtras} | Total: ${total}</p><p>Feche esta aba.</p>`);
      } catch (err) {
        console.error('Erro:', err);
        res.end('Erro: ' + err.message);
      } finally {
        server.close();
        await prisma.$disconnect();
      }
    });
  });
  tokenReq.write(body);
  tokenReq.end();
});

server.listen(3007);
