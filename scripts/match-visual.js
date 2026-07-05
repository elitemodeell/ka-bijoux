/**
 * Interface visual para associar imagens novas a produtos sem imagem
 * Roda um servidor local em http://localhost:3030
 * Abra no navegador, arraste/selecione cada imagem para o produto certo
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const BACKEND = path.resolve(__dirname, '..', 'backend');
const DOWNLOADS = 'C:/Users/bruno/Downloads/produtos sex shop';
const UPLOADS = path.join(BACKEND, 'public', 'uploads', 'products');
const MAPPING_PATH = path.join(BACKEND, 'data', 'mapeamento-imagens-produtos.json');
const IMAGE_FILES_PATH = path.join(BACKEND, 'data', 'bling-image-files.json');

require('dotenv').config({ path: path.join(BACKEND, '.env') });

const blingRows = require(path.join(BACKEND, 'data', 'produtos-bling.json'));
const mapping = require(MAPPING_PATH);
const imageFiles = require(IMAGE_FILES_PATH);

// Imagens já mapeadas
const mappedSrcs = new Set(mapping.map(m => m.src).filter(Boolean));

// Imagens novas (excluindo cópias)
const novas = fs.readdirSync(DOWNLOADS)
  .filter(f => f.endsWith('.png') && !f.includes('- Copia') && !mappedSrcs.has(f))
  .sort();

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}
function isAdult(name) {
  const n = norm(name);
  return /gel|creme|lub|vibrador|bullet|anel.pen|peniano|masturbad|egg|plug|algema|dedeira|capsule|sexy|garganta|yummy|beijo|excita|tesao|nabuc|nocuc|rivosex|kama|perere|fofato|pirocad|napep|amox|janumete|mete.fich|vamos.ser|bala.liquid|intimo|k.med|hot.?ice|sempre.?virgem|tapa.mamilo|caneta.com|jogo.seduc|roleta|desodorante.intimo|lenco/.test(n);
}

// Build maps
const byId = new Map();
const bySku = new Map();
for (const item of mapping) {
  if (item.id) byId.set(String(item.id), item);
  if (item.sku) bySku.set(String(item.sku), item);
}

// Produtos sem imagem
function hasImage(row) {
  const id = String(row.id || '');
  const sku = String(row.codigo || '');
  if (byId.has(id)) {
    const e = byId.get(id);
    const fn = e.nome || e.src || '';
    if (fn && (fs.existsSync(path.join(UPLOADS, fn)) || imageFiles.includes(fn))) return true;
  }
  if (bySku.has(sku)) {
    const e = bySku.get(sku);
    const fn = e.nome || e.src || '';
    if (fn && (fs.existsSync(path.join(UPLOADS, fn)) || imageFiles.includes(fn))) return true;
  }
  return false;
}

const semImagem = blingRows
  .filter(r => r.situacao === 'A' && isAdult(r.nome || '') && !hasImage(r))
  .map(r => ({ id: String(r.id), sku: r.codigo || '', name: r.nome || '', preco: r.preco || '0' }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Gerar HTML
function buildHTML() {
  const imgCards = novas.map((f, i) => {
    const filePath = path.join(DOWNLOADS, f).replace(/\\/g, '/');
    return `
    <div class="img-card" id="img-${i}" draggable="true" ondragstart="drag(event,${i})" onclick="selectImg(${i})">
      <img src="file:///${filePath}" loading="lazy">
      <div class="img-num">${i + 1}</div>
      <div class="img-fname">${f.replace('ChatGPT Image ', '').substring(0, 30)}</div>
      <div class="img-status" id="status-${i}">livre</div>
    </div>`;
  }).join('');

  const prodRows = semImagem.map((p, i) => `
    <tr id="prod-${i}" ondrop="drop(event,${i})" ondragover="allow(event)" class="prod-row">
      <td>${i + 1}</td>
      <td><b>${p.name}</b><br><small>SKU: ${p.sku}</small></td>
      <td>R$ ${Number(p.preco).toFixed(2)}</td>
      <td class="match-cell" id="match-${i}">
        <span class="no-match">— clique em imagem —</span>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>KA Bijoux — Associar Imagens</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: sans-serif; background: #111; color: #eee; }
  .header { background: #1a1a1a; padding: 16px 24px; border-bottom: 1px solid #333; display: flex; align-items: center; gap: 16px; }
  .header h1 { color: #f90; font-size: 20px; }
  .header .info { color: #aaa; font-size: 13px; }
  .btn { background: #f90; color: #000; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; }
  .btn:hover { background: #fa0; }
  .btn-ok { background: #2a2; color: #fff; }
  .layout { display: grid; grid-template-columns: 1fr 2fr; height: calc(100vh - 65px); }
  .left { overflow-y: auto; padding: 16px; border-right: 1px solid #222; }
  .left h2 { color: #aaa; font-size: 13px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
  .img-card { background: #1e1e1e; border: 2px solid #333; border-radius: 8px; overflow: hidden; cursor: pointer; transition: border-color 0.15s; position: relative; }
  .img-card:hover { border-color: #f90; }
  .img-card.selected { border-color: #f90; box-shadow: 0 0 0 3px #f903; }
  .img-card.used { border-color: #2a2; opacity: 0.7; }
  .img-card img { width: 100%; height: 90px; object-fit: contain; background: #2a2a2a; display: block; }
  .img-num { position: absolute; top: 4px; left: 4px; background: #f90; color: #000; font-size: 10px; font-weight: bold; padding: 2px 5px; border-radius: 4px; }
  .img-fname { font-size: 9px; color: #666; padding: 3px 4px; line-height: 1.3; }
  .img-status { font-size: 10px; color: #aaa; padding: 0 4px 4px; }
  .img-card.used .img-status { color: #2a8; }
  .right { overflow-y: auto; padding: 16px; }
  .right h2 { color: #aaa; font-size: 13px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1a1a1a; padding: 8px 12px; text-align: left; color: #aaa; position: sticky; top: 0; }
  .prod-row { border-bottom: 1px solid #222; }
  .prod-row td { padding: 8px 12px; vertical-align: middle; }
  .prod-row:hover { background: #1a1a1a; }
  .prod-row.matched { background: #0a200a; }
  .match-cell { min-width: 140px; }
  .no-match { color: #555; font-size: 12px; }
  .match-preview { display: flex; align-items: center; gap: 8px; }
  .match-preview img { width: 50px; height: 50px; object-fit: contain; background: #2a2a2a; border-radius: 4px; border: 1px solid #2a2; }
  .match-num { font-size: 11px; color: #2a8; }
  .remove-btn { background: #400; color: #f88; border: none; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 11px; }
  .remove-btn:hover { background: #600; }
  .progress { background: #1a1a1a; padding: 8px 24px; border-top: 1px solid #222; display: flex; align-items: center; gap: 16px; font-size: 13px; }
  .counter { color: #f90; font-weight: bold; }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>KA Bijoux — Associar Imagens a Produtos</h1>
    <div class="info">${novas.length} imagens novas | ${semImagem.length} produtos sem imagem</div>
  </div>
  <div style="margin-left:auto;display:flex;gap:10px">
    <button class="btn" onclick="salvar()">💾 Salvar mapeamento</button>
  </div>
</div>
<div class="layout">
  <div class="left">
    <h2>Imagens (clique para selecionar)</h2>
    <div class="img-grid">${imgCards}</div>
  </div>
  <div class="right">
    <h2>Produtos sem imagem (clique na linha para associar imagem selecionada)</h2>
    <table>
      <thead><tr><th>#</th><th>Produto</th><th>Preço</th><th>Imagem</th></tr></thead>
      <tbody>${prodRows}</tbody>
    </table>
  </div>
</div>

<script>
const produtos = ${JSON.stringify(semImagem)};
const imagens = ${JSON.stringify(novas)};
let selectedImg = null;
const matches = {}; // prodIdx -> imgIdx

function selectImg(idx) {
  if (selectedImg !== null) {
    document.getElementById('img-' + selectedImg).classList.remove('selected');
  }
  selectedImg = idx;
  document.getElementById('img-' + idx).classList.add('selected');
}

function allow(e) { e.preventDefault(); }
function drag(e, idx) { e.dataTransfer.setData('text', idx); selectImg(idx); }

function drop(e, prodIdx) {
  e.preventDefault();
  const imgIdx = parseInt(e.dataTransfer.getData('text') || selectedImg);
  if (isNaN(imgIdx)) return;
  associar(prodIdx, imgIdx);
}

document.querySelectorAll('.prod-row').forEach((row, i) => {
  row.addEventListener('click', () => {
    if (selectedImg === null) { alert('Primeiro clique em uma imagem à esquerda.'); return; }
    associar(i, selectedImg);
  });
});

function associar(prodIdx, imgIdx) {
  // Remove existing match for this product
  if (matches[prodIdx] !== undefined) {
    const oldImg = matches[prodIdx];
    document.getElementById('img-' + oldImg).classList.remove('used');
    document.getElementById('status-' + oldImg).textContent = 'livre';
  }
  // Remove existing match for this image (if assigned elsewhere)
  for (const [pi, ii] of Object.entries(matches)) {
    if (ii === imgIdx && parseInt(pi) !== prodIdx) {
      delete matches[pi];
      document.getElementById('prod-' + pi).classList.remove('matched');
      document.getElementById('match-' + pi).innerHTML = '<span class="no-match">— clique em imagem —</span>';
    }
  }
  matches[prodIdx] = imgIdx;
  const p = produtos[prodIdx];
  const f = imagens[imgIdx];
  const filePath = 'file:///C:/Users/bruno/Downloads/produtos sex shop/' + encodeURIComponent(f);
  document.getElementById('match-' + prodIdx).innerHTML =
    '<div class="match-preview"><img src="' + filePath + '"><div><div class="match-num">Img ' + (imgIdx+1) + '</div><div style="font-size:10px;color:#888">' + f.substring(14, 44) + '...</div><button class="remove-btn" onclick="remover(' + prodIdx + ')">✕</button></div></div>';
  document.getElementById('prod-' + prodIdx).classList.add('matched');
  document.getElementById('img-' + imgIdx).classList.add('used');
  document.getElementById('status-' + imgIdx).textContent = '→ ' + p.name.substring(0, 20);
  updateCounter();
}

function remover(prodIdx) {
  if (matches[prodIdx] !== undefined) {
    const imgIdx = matches[prodIdx];
    document.getElementById('img-' + imgIdx).classList.remove('used');
    document.getElementById('status-' + imgIdx).textContent = 'livre';
    delete matches[prodIdx];
    document.getElementById('prod-' + prodIdx).classList.remove('matched');
    document.getElementById('match-' + prodIdx).innerHTML = '<span class="no-match">— clique em imagem —</span>';
    updateCounter();
  }
}

function updateCounter() {
  const n = Object.keys(matches).length;
  document.title = '(' + n + ' associadas) KA Bijoux';
}

async function salvar() {
  const lista = [];
  for (const [prodIdx, imgIdx] of Object.entries(matches)) {
    lista.push({ produto: produtos[parseInt(prodIdx)], imagem: imagens[imgIdx] });
  }
  if (lista.length === 0) { alert('Nenhuma associação feita ainda.'); return; }
  const resp = await fetch('/salvar', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(lista) });
  const result = await resp.json();
  alert(result.msg);
}
</script>
</body>
</html>`;
}

// Gerar slug
function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:3030');

  if (req.method === 'GET' && u.pathname === '/') {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(buildHTML());
    return;
  }

  if (req.method === 'POST' && u.pathname === '/salvar') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const lista = JSON.parse(body);
        const mapping2 = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
        const imageFiles2 = JSON.parse(fs.readFileSync(IMAGE_FILES_PATH, 'utf8'));

        let count = 0;
        for (const { produto, imagem } of lista) {
          // Nome do arquivo final: slug do produto + sku + .jpg
          const nomeArquivo = slugify(produto.name) + (produto.sku ? '-' + produto.sku : '') + '.jpg';
          const srcPath = path.join(DOWNLOADS, imagem);
          const destPath = path.join(UPLOADS, nomeArquivo);

          // Copiar imagem para uploads
          fs.copyFileSync(srcPath, destPath);

          // Adicionar ao mapeamento
          const entry = {
            src: imagem,
            nome: nomeArquivo,
            id: produto.id,
            sku: produto.sku || null,
            obs: 'Associado via interface visual em ' + new Date().toISOString().split('T')[0],
          };
          // Remover entrada antiga para o mesmo ID
          const idx = mapping2.findIndex(m => String(m.id) === String(produto.id) || String(m.sku) === String(produto.sku));
          if (idx >= 0) mapping2.splice(idx, 1);
          mapping2.push(entry);

          // Adicionar a bling-image-files.json
          if (!imageFiles2.includes(nomeArquivo)) imageFiles2.push(nomeArquivo);

          count++;
        }

        fs.writeFileSync(MAPPING_PATH, JSON.stringify(mapping2, null, 2), 'utf8');
        fs.writeFileSync(IMAGE_FILES_PATH, JSON.stringify(imageFiles2, null, 2), 'utf8');

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ msg: count + ' imagens associadas e salvas! Agora rode: git add -A && git commit && git push' }));
      } catch(e) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ msg: 'Erro: ' + e.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(3030, () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║  KA Bijoux — Associar Imagens a Produtos   ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\nAbra no navegador: http://localhost:3030');
  console.log('\nInstruções:');
  console.log('  1. Clique em uma imagem à esquerda para selecioná-la');
  console.log('  2. Clique na linha do produto correspondente à direita');
  console.log('  3. Repita para cada imagem');
  console.log('  4. Clique em "Salvar mapeamento" quando terminar');
  console.log('\nCtrl+C para sair\n');
});
