/**
 * Gera relatório visual HTML de auditoria da linha adulto
 */
const fs = require('fs');
const path = require('path');
const BACKEND = path.resolve(__dirname, '..', 'backend');

const blingRows = require(path.join(BACKEND, 'data', 'produtos-bling.json'));
const mapping = require(path.join(BACKEND, 'data', 'mapeamento-imagens-produtos.json'));
const imageFiles = require(path.join(BACKEND, 'data', 'bling-image-files.json'));

function uploadFileExists(f) {
  if (!f) return false;
  const name = f.replace(/^.*[\\/]/, '');
  return fs.existsSync(path.join(BACKEND, 'public', 'uploads', 'products', name)) || imageFiles.includes(name);
}

const byId = new Map();
const bySku = new Map();
for (const item of mapping) {
  if (item.id) byId.set(String(item.id), item);
  if (item.sku) bySku.set(String(item.sku), item);
}

function isAdultLike(name) {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return /gel|creme|lub|vibrador|bullet|anel.pen|peniano|masturbad|egg|plug|algema|dedeira|capsule|sexy|garganta|yummy|beijo|excita|tesao|nabuc|nocuc|rivosex|kama|perere|fofato|pirocad|napep|amox|janumete|mete.fich|vamos.ser|bala.liquid|intimo|k.med|hot.?ice|sempre.?virgem|tapa.mamilo|caneta.com|jogo.seduc|roleta/.test(n);
}

const products = [];
const needsImage = [];

for (const row of blingRows) {
  const name = (row.nome || '').trim();
  if (!isAdultLike(name)) continue;
  if (row.situacao !== 'A') continue;
  const id = String(row.id || '');
  const sku = String(row.codigo || '');
  let imageFile = '';
  let source = 'NONE';
  if (byId.has(id)) {
    const e = byId.get(id);
    const fn = e.nome || e.src || '';
    if (uploadFileExists(fn)) { imageFile = fn; source = 'ID'; }
  } else if (bySku.has(sku)) {
    const e = bySku.get(sku);
    const fn = e.nome || e.src || '';
    if (uploadFileExists(fn)) { imageFile = fn; source = 'SKU'; }
  }
  if (imageFile) products.push({ name, sku, imageFile, source });
  else needsImage.push({ name, sku });
}

const SUPABASE = 'https://sxohqngzypmxtmuulfoa.supabase.co/storage/v1/object/public/products';

const cardHTML = products.map(p => {
  const localUrl = '../backend/public/uploads/products/' + p.imageFile;
  const supaUrl = SUPABASE + '/' + encodeURIComponent(p.imageFile);
  return [
    '<div class="card">',
    '<img src="' + localUrl + '" alt="" loading="lazy" onerror="this.src=\'' + supaUrl + '\'">',
    '<div class="info">',
    '<div class="nome">' + p.name + '</div>',
    '<div class="sku">SKU: ' + p.sku + '</div>',
    '<div class="src">Fonte: ' + p.source + '</div>',
    '<div class="file">' + p.imageFile.substring(0, 38) + '</div>',
    '</div></div>',
  ].join('\n');
}).join('\n');

const missingAneis = needsImage.filter(p => p.name.includes('ANEL PENIANO SEXY'));
const missingOthers = needsImage.filter(p => !p.name.includes('ANEL PENIANO SEXY'));

const missingAneisHTML = missingAneis.map(p =>
  '<div class="need"><b>' + p.name + '</b><br><small>SKU: ' + p.sku + '</small></div>'
).join('\n');

const missingOthersHTML = missingOthers.map(p =>
  '<div class="other-miss">' + p.name + ' <small>(' + p.sku + ')</small></div>'
).join('\n');

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>KA Bijoux — Auditoria Linha Adulto</title>
<style>
  body { font-family: sans-serif; background: #111; color: #eee; padding: 20px; }
  h1 { color: #f90; margin-bottom: 4px; }
  h2 { color: #ccc; border-bottom: 1px solid #333; padding-bottom: 8px; margin-top: 40px; }
  p { color: #aaa; }
  .stats { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 16px; margin: 16px 0; display: flex; gap: 32px; }
  .stat { text-align: center; }
  .stat .n { font-size: 36px; font-weight: bold; color: #f90; }
  .stat .l { font-size: 12px; color: #aaa; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px; margin-bottom: 40px; }
  .card { background: #1e1e1e; border-radius: 8px; overflow: hidden; border: 2px solid #2a5; }
  .card img { width: 100%; height: 160px; object-fit: contain; background: #2a2a2a; }
  .card .info { padding: 8px; }
  .card .nome { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
  .card .sku { font-size: 11px; color: #888; }
  .card .src { font-size: 10px; color: #4a4; margin-top: 2px; }
  .card .file { font-size: 10px; color: #666; margin-top: 2px; word-break: break-all; }
  .need { background: #300; border: 1px solid #900; border-radius: 6px; padding: 10px 14px; margin: 6px 0; }
  .other-miss { font-size: 12px; color: #666; padding: 2px 0; }
  details summary { cursor: pointer; color: #888; padding: 8px 0; }
  .alert { background: #320; border: 1px solid #a60; border-radius: 8px; padding: 12px 16px; color: #fa0; margin: 12px 0; }
</style>
</head>
<body>
<h1>KA Bijoux — Auditoria Linha Adulto</h1>
<p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>

<div class="stats">
  <div class="stat"><div class="n">${products.length}</div><div class="l">com imagem</div></div>
  <div class="stat"><div class="n" style="color:#f44">${missingAneis.length}</div><div class="l">precisam foto nova</div></div>
  <div class="stat"><div class="n" style="color:#888">${missingOthers.length}</div><div class="l">sem imagem (ocultos)</div></div>
</div>

<div class="alert">
  ⚠️ A categoria <b>Linha Adulto</b> está PAUSADA. Ela só será reativada manualmente após revisão visual deste relatório.
</div>

<h2>✅ Produtos COM imagem — verificar visualmente se estão corretos</h2>
<p>Todos os ${products.length} produtos abaixo têm imagem vinculada por ID Bling ou SKU (sem matching fuzzy).</p>
<div class="grid">
${cardHTML}
</div>

<h2>❌ Imagens removidas — precisam de foto nova</h2>
<p>As imagens desses produtos foram removidas pois continham fotos de produtos diferentes.</p>
${missingAneisHTML}

<h2>📦 Outros ${missingOthers.length} produtos sem imagem (ficarão ocultos)</h2>
<details>
<summary>${missingOthers.length} produtos sem imagem (ocultos automaticamente com requireImage=true)</summary>
${missingOthersHTML}
</details>

</body>
</html>`;

const outPath = path.join(__dirname, 'auditoria-visual.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('HTML salvo em: scripts/auditoria-visual.html');
console.log('Produtos com imagem: ' + products.length);
console.log('Precisam foto nova: ' + missingAneis.length);
console.log('Outros sem imagem: ' + missingOthers.length);
