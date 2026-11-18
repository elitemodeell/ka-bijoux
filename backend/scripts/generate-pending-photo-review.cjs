const fs = require("node:fs/promises");
const path = require("node:path");

const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error("Use: generate-pending-photo-review <pending.json> <review.html>");
  const source = JSON.parse(await fs.readFile(input, "utf8"));
  if (source.projectRef !== "sxohqngzypmxtmuulfoa" || !Array.isArray(source.galleries)) throw new Error("Arquivo incompatível com a KA BIJOUX.");
  const cards = source.galleries.map((gallery, index) => `<article>
    <h2>${index + 1}. ${escape(gallery.name)}</h2><p><strong>SKU:</strong> ${escape(gallery.sku || "sem SKU")}</p>
    <p class="warning">As imagens abaixo foram reprovadas visualmente. Não reutilizar sem confirmação da loja.</p>
    <div class="photos">${gallery.before.map((photo) => `<figure><img src="${escape(photo.url)}" alt="${escape(photo.alt || gallery.name)}"><figcaption>${escape(photo.url)}</figcaption></figure>`).join("")}</div>
    <p><strong>Solicitação:</strong> enviar fotografia autorizada do produto e confirmar SKU/modelo/cor visível.</p>
  </article>`).join("\n");
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KA BIJOUX · Fotos pendentes</title><style>body{font:16px system-ui;margin:24px;background:#faf8f7;color:#26201e}main{max-width:1200px;margin:auto}article{background:#fff;border:1px solid #e7deda;border-radius:12px;padding:18px;margin:16px 0}.photos{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0;width:220px}img{display:block;width:220px;height:220px;object-fit:contain;background:#f4f1ef;border-radius:8px}figcaption{font-size:11px;overflow-wrap:anywhere}.warning{color:#9a3412;font-weight:600}</style><main><h1>KA BIJOUX · 21 galerias pendentes</h1><p>Material interno de revisão. As fotos exibidas são as associações atuais reprovadas, para substituição pela equipe.</p>${cards}</main></html>`;
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await fs.writeFile(output, html, { mode: 0o600 });
  console.log(JSON.stringify({ galleries: source.galleries.length, photos: source.galleries.reduce((count, gallery) => count + gallery.before.length, 0), output: path.resolve(output) }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
