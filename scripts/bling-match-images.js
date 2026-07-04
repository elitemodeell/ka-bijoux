/**
 * bling-match-images.js
 *
 * Pega as 118 imagens sem SKU no nome e tenta casar com produtos do Bling
 * pelo nome do arquivo vs nome do produto Bling.
 *
 * Rodar com: NODE_PATH=./backend/node_modules node scripts/bling-match-images.js
 */

const path  = require('path');
const http  = require('http');
const https = require('https');
const fs    = require('fs');

const BACKEND_DIR  = path.resolve(__dirname, '..', 'backend');
require('dotenv').config({ path: path.join(BACKEND_DIR, '.env') });

const CLIENT_ID     = 'a328177fa4108c47078a0f0eb17395ba29bdd6cb';
const CLIENT_SECRET = '795e2d2d93be82d84a902cd5958ae7f09a97424dfdc513c3ec2be73853f2';
const REDIRECT_URI  = 'http://localhost:3007';
const IMAGES_DIR    = path.join(BACKEND_DIR, 'public', 'uploads', 'products');

// ── Normaliza string para comparação ─────────────────────────────────────────
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/\.\w+$/, '')          // remove extensão
    .replace(/[-_]/g, ' ')          // traço → espaço
    .replace(/\d+ml\b/g, '')        // remove medidas: 15ml, 18ml...
    .replace(/\d+g\b/g, '')         // remove: 15g, 40g...
    .replace(/\d+cm\b/g, '')        // remove: 45cm...
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Score de similaridade por palavras em comum ───────────────────────────────
function score(a, b) {
  const wa = new Set(a.split(' ').filter(w => w.length > 2));
  const wb = new Set(b.split(' ').filter(w => w.length > 2));
  if (wa.size === 0 || wb.size === 0) return 0;
  let matches = 0;
  for (const w of wa) if (wb.has(w)) matches++;
  // Bônus se uma contém a outra como substring
  const bonus = a.includes(b) || b.includes(a) ? 2 : 0;
  return (matches + bonus) / Math.max(wa.size, wb.size);
}

// ── Busca todos os produtos do Bling (paginado) ───────────────────────────────
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
    process.stdout.write(`\r  Buscando Bling: ${products.length} produtos...`);
    if (items.length < 100) break;
    page++;
  }
  console.log();
  return products;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const STATE   = 'kabijoux_match_' + Date.now();
const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${STATE}`;

console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║   KA BIJOUX — CRUZAR IMAGENS SEM SKU × BLING     ║');
console.log('╚═══════════════════════════════════════════════════╝');
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
        console.log('Erro ao obter token:', data);
        res.end('Erro ao obter token');
        server.close();
        return;
      }

      try {
        console.log('Token obtido! Buscando produtos do Bling...\n');
        const blingProducts = await fetchAllBlingProducts(token.access_token);
        console.log(`Total no Bling: ${blingProducts.length} produtos\n`);

        // Imagens sem SKU
        const skuRegex = /3104000\d+/;
        const allFiles = fs.readdirSync(IMAGES_DIR);
        const semSku   = allFiles.filter(f => !skuRegex.test(f));

        // Normalizar nomes Bling
        const blingNorm = blingProducts.map(p => ({
          id:    p.id,
          sku:   p.codigo,
          nome:  p.nome,
          preco: p.preco,
          norm:  normalize(p.nome || ''),
        }));

        console.log(`\nCRUZAMENTO — ${semSku.length} imagens sem SKU\n`);
        console.log('ARQUIVO'.padEnd(55) + ' | ' + 'MELHOR MATCH BLING'.padEnd(45) + ' | SKU'.padEnd(16) + ' | SCORE');
        console.log('─'.repeat(140));

        const resultados = [];
        for (const imgFile of semSku) {
          const normImg = normalize(imgFile);
          let best = null, bestScore = 0;
          for (const b of blingNorm) {
            const s = score(normImg, b.norm);
            if (s > bestScore) { bestScore = s; best = b; }
          }

          resultados.push({ imgFile, normImg, best, bestScore });

          const scoreLabel = bestScore >= 0.6 ? '✓ ALTO' : bestScore >= 0.3 ? '~ MÉDIO' : '✗ BAIXO';
          console.log(
            imgFile.padEnd(55) + ' | ' +
            (best?.nome || '').substring(0, 44).padEnd(45) + ' | ' +
            (best?.sku || '').toString().padEnd(15) + ' | ' +
            bestScore.toFixed(2) + ' ' + scoreLabel
          );
        }

        // Resumo
        const alto   = resultados.filter(r => r.bestScore >= 0.6).length;
        const medio  = resultados.filter(r => r.bestScore >= 0.3 && r.bestScore < 0.6).length;
        const baixo  = resultados.filter(r => r.bestScore < 0.3).length;

        console.log('\n─'.repeat(140));
        console.log(`\nRESUMO:`);
        console.log(`  ✓ ALTO (≥0.6)  — provavelmente o mesmo produto: ${alto}`);
        console.log(`  ~ MÉDIO (0.3-0.6) — verificar manualmente: ${medio}`);
        console.log(`  ✗ BAIXO (<0.3)  — provavelmente produto novo: ${baixo}`);

        // Salvar CSV para revisão
        const csvPath = path.join(__dirname, 'match-result.csv');
        const csvLines = ['arquivo,nome_bling,sku_bling,preco_bling,score'];
        for (const r of resultados) {
          csvLines.push(`"${r.imgFile}","${r.best?.nome || ''}","${r.best?.sku || ''}","${r.best?.preco || ''}","${r.bestScore.toFixed(2)}"`);
        }
        fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
        console.log(`\nResultado salvo em: scripts/match-result.csv`);

        res.end('<h1>Cruzamento concluído!</h1><p>Veja o terminal para o resultado.</p><p>Feche esta aba.</p>');
      } catch (err) {
        console.error('Erro:', err);
        res.end('Erro: ' + err.message);
      } finally {
        server.close();
      }
    });
  });
  tokenReq.write(body);
  tokenReq.end();
});

server.listen(3007);
