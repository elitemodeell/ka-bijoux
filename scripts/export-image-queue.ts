/**
 * KA Bijoux — Exportador de Fila de Imagens
 * ============================================================
 * Exporta subsets da fila de geração de imagens para ferramentas
 * externas (n8n, Make, planilhas, Airtable, etc.).
 *
 * Uso:
 *   cd scripts && npx tsx export-image-queue.ts
 *   npx tsx export-image-queue.ts --batch 1
 *   npx tsx export-image-queue.ts --category bijuterias --limit 100
 *   npx tsx export-image-queue.ts --only-prompts --batch 2
 *   npx tsx export-image-queue.ts --status FILA --format airtable
 *
 * Formatos disponíveis: json | csv | prompts-only | airtable | n8n
 */

import fs   from 'fs';
import path from 'path';

const ROOT    = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'reports');
const BATCHES = path.join(REPORTS, 'image-batches');
const GEN_DIR = path.join(ROOT, 'generated-product-images');

// ── CLI args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag: string): string | null {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}
function hasFlag(flag: string): boolean { return args.includes(flag); }

const filterBatch    = getArg('--batch');
const filterCategory = getArg('--category');
const filterStatus   = getArg('--status');
const limitArg       = getArg('--limit');
const outputFormat   = getArg('--format') ?? 'csv';
const onlyPrompts    = hasFlag('--only-prompts');

// ── Types ─────────────────────────────────────────────────────
interface QueueItem {
  productId:       string;
  sku:             string;
  slug:            string;
  productName:     string;
  category:        string;
  categoryName:    string;
  subcategory:     string;
  subcategoryName: string;
  price:           number;
  stock:           number;
  color:           string;
  flavor:          string;
  variation:       string;
  currentImage:    string;
  imageStatus:     string;
  desiredFileName: string;
  generatedPrompt: string;
  status:          string;
}

interface BatchFile {
  batchNumber:  number;
  totalBatches: number;
  items:        QueueItem[];
}

interface QueueReport {
  summary:  { generatedAt: string; totalNeedsGeneration: number };
  products: QueueItem[];
}

// ── Load ───────────────────────────────────────────────────────
function loadQueue(): QueueItem[] {
  const queuePath = path.join(REPORTS, 'image-generation-queue.json');
  if (!fs.existsSync(queuePath)) {
    console.error('❌ Fila não encontrada: reports/image-generation-queue.json');
    console.error('   Execute primeiro: npx tsx audit-catalog.ts');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(queuePath, 'utf-8')) as QueueItem[];
}

function loadBatch(n: number): QueueItem[] {
  const file = path.join(BATCHES, `batch-${String(n).padStart(3, '0')}.json`);
  if (!fs.existsSync(file)) {
    console.error(`❌ Lote não encontrado: batch-${String(n).padStart(3, '0')}.json`);
    process.exit(1);
  }
  return (JSON.parse(fs.readFileSync(file, 'utf-8')) as BatchFile).items;
}

// ── Status tracking (images already in approved/imported) ─────
function buildDoneSet(): Set<string> {
  const done = new Set<string>();
  for (const dir of ['approved', 'imported']) {
    const dirPath = path.join(GEN_DIR, dir);
    if (fs.existsSync(dirPath)) {
      for (const f of fs.readdirSync(dirPath)) {
        done.add(f.toLowerCase());
      }
    }
  }
  return done;
}

// ── Formatters ────────────────────────────────────────────────
function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(items: QueueItem[], done: Set<string>, outPath: string) {
  const header = [
    'index', 'productId', 'sku', 'productName', 'category', 'categoryName',
    'subcategory', 'color', 'flavor', 'price', 'stock',
    'imageStatus', 'desiredFileName', 'queueStatus', 'doneFlag', 'prompt',
  ].join(',');

  const rows = items.map((i, idx) => [
    idx + 1,
    i.productId,
    i.sku,
    csvEscape(i.productName),
    i.category,
    csvEscape(i.categoryName),
    i.subcategory,
    i.color,
    i.flavor,
    i.price,
    i.stock,
    i.imageStatus,
    i.desiredFileName,
    i.status,
    done.has(i.desiredFileName.toLowerCase()) ? 'CONCLUÍDO' : 'PENDENTE',
    csvEscape(i.generatedPrompt),
  ].join(','));

  fs.writeFileSync(outPath, [header, ...rows].join('\n'), 'utf-8');
  console.log(`✅ CSV exportado:           ${path.relative(ROOT, outPath)}`);
}

function writeJson(items: QueueItem[], done: Set<string>, outPath: string) {
  const payload = {
    exportedAt: new Date().toISOString(),
    totalItems: items.length,
    pending:    items.filter(i => !done.has(i.desiredFileName.toLowerCase())).length,
    completed:  items.filter(i =>  done.has(i.desiredFileName.toLowerCase())).length,
    filters: {
      batch:    filterBatch    ?? null,
      category: filterCategory ?? null,
      status:   filterStatus   ?? null,
    },
    items: items.map((i, idx) => ({
      ...i,
      index:    idx + 1,
      doneFlag: done.has(i.desiredFileName.toLowerCase()) ? 'CONCLUÍDO' : 'PENDENTE',
    })),
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`✅ JSON exportado:          ${path.relative(ROOT, outPath)}`);
}

function writePromptsOnly(items: QueueItem[], outPath: string) {
  const lines = items.map((i, idx) =>
    `# ${idx + 1} — ${i.desiredFileName}\n${i.generatedPrompt}`
  );
  fs.writeFileSync(outPath, lines.join('\n\n---\n\n'), 'utf-8');
  console.log(`✅ Prompts exportados:      ${path.relative(ROOT, outPath)}`);
}

// Airtable-ready: flattened rows, no nested objects
function writeAirtable(items: QueueItem[], done: Set<string>, outPath: string) {
  const header = [
    'Nome do Produto', 'SKU', 'ID Bling', 'Categoria', 'Subcategoria',
    'Cor', 'Sabor/Aroma', 'Preço R$', 'Estoque', 'Status Imagem',
    'Arquivo Desejado', 'Status Fila', 'Concluído', 'Prompt IA',
  ].join('\t');

  const rows = items.map(i => [
    i.productName,
    i.sku,
    i.productId,
    i.categoryName,
    i.subcategoryName || '',
    i.color,
    i.flavor,
    i.price.toFixed(2).replace('.', ','),
    i.stock,
    i.imageStatus,
    i.desiredFileName,
    i.status,
    done.has(i.desiredFileName.toLowerCase()) ? 'Sim' : 'Não',
    i.generatedPrompt,
  ].join('\t'));

  fs.writeFileSync(outPath, [header, ...rows].join('\n'), 'utf-8');
  console.log(`✅ Airtable TSV exportado:  ${path.relative(ROOT, outPath)}`);
  console.log('   (Abra no Excel/Google Sheets → Arquivo → Importar → Separado por tabulações)');
}

// n8n-ready: array of objects with simple keys
function writeN8n(items: QueueItem[], done: Set<string>, outPath: string) {
  const payload = items.map((i, idx) => ({
    index:           idx + 1,
    productId:       i.productId,
    sku:             i.sku,
    productName:     i.productName,
    category:        i.category,
    subcategory:     i.subcategory,
    color:           i.color || null,
    flavor:          i.flavor || null,
    price:           i.price,
    stock:           i.stock,
    imageStatus:     i.imageStatus,
    desiredFileName: i.desiredFileName,
    queueStatus:     i.status,
    done:            done.has(i.desiredFileName.toLowerCase()),
    prompt:          i.generatedPrompt,
  }));
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`✅ n8n JSON exportado:      ${path.relative(ROOT, outPath)}`);
}

// ── Progress report ───────────────────────────────────────────
function printProgress(all: QueueItem[], done: Set<string>) {
  const total     = all.length;
  const completed = all.filter(i => done.has(i.desiredFileName.toLowerCase())).length;
  const pending   = total - completed;
  const pct       = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

  console.log('\n📊 PROGRESSO GERAL:');
  console.log(`   Total na fila:   ${total}`);
  console.log(`   Concluídos:      ${completed}  (${pct}%)`);
  console.log(`   Pendentes:       ${pending}`);

  const bar = Math.round(completed / total * 40);
  console.log(`   [${'█'.repeat(bar)}${' '.repeat(40 - bar)}] ${pct}%\n`);
}

// ── Category breakdown ────────────────────────────────────────
function printCategoryBreakdown(items: QueueItem[]) {
  const bycat = new Map<string, number>();
  for (const i of items) {
    const key = i.categoryName || i.category;
    bycat.set(key, (bycat.get(key) ?? 0) + 1);
  }
  const sorted = [...bycat.entries()].sort((a, b) => b[1] - a[1]);
  console.log('📂 Por categoria:');
  for (const [cat, count] of sorted) {
    console.log(`   ${cat.padEnd(35)} ${count}`);
  }
}

// ── Main ───────────────────────────────────────────────────────
function main() {
  console.log('📤 KA Bijoux — Exportador de Fila de Imagens\n');

  let items: QueueItem[];

  if (filterBatch) {
    const n = parseInt(filterBatch, 10);
    console.log(`📦 Carregando lote ${n}...`);
    items = loadBatch(n);
  } else {
    console.log('📋 Carregando fila completa...');
    items = loadQueue();
  }

  console.log(`   ${items.length} itens carregados`);

  // Apply filters
  if (filterCategory) {
    items = items.filter(i => i.category === filterCategory || i.subcategory === filterCategory || i.categoryName === filterCategory);
    console.log(`   Filtro categoria → ${items.length} itens`);
  }
  if (filterStatus) {
    items = items.filter(i => i.imageStatus === filterStatus || i.status === filterStatus);
    console.log(`   Filtro status → ${items.length} itens`);
  }
  if (limitArg) {
    const limit = parseInt(limitArg, 10);
    items = items.slice(0, limit);
    console.log(`   Limite aplicado → ${items.length} itens`);
  }

  if (items.length === 0) {
    console.log('\n⚠️  Nenhum produto encontrado com os filtros aplicados.');
    process.exit(0);
  }

  // Check what's already done
  const done = buildDoneSet();
  console.log(`\n🗸  Imagens já aprovadas/importadas: ${done.size}`);

  // Progress overview (only when not filtering to a specific batch)
  if (!filterBatch && !filterCategory && !filterStatus) {
    const allItems = loadQueue();
    printProgress(allItems, done);
    printCategoryBreakdown(allItems);
    console.log('');
  }

  fs.mkdirSync(REPORTS, { recursive: true });

  const suffix = [
    filterBatch    ? `lote${filterBatch}`   : '',
    filterCategory ? filterCategory         : '',
    filterStatus   ? filterStatus           : '',
  ].filter(Boolean).join('-') || 'completo';

  if (onlyPrompts) {
    writePromptsOnly(items, path.join(REPORTS, `prompts-${suffix}.txt`));
  } else {
    switch (outputFormat) {
      case 'json':     writeJson(items, done, path.join(REPORTS, `fila-export-${suffix}.json`)); break;
      case 'airtable': writeAirtable(items, done, path.join(REPORTS, `fila-airtable-${suffix}.tsv`)); break;
      case 'n8n':      writeN8n(items, done, path.join(REPORTS, `fila-n8n-${suffix}.json`)); break;
      default:         writeCsv(items, done, path.join(REPORTS, `fila-export-${suffix}.csv`)); break;
    }
  }

  console.log('\n🏁 Exportação concluída!');
}

main();
