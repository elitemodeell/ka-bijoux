/**
 * KA Bijoux — Gerador de Prompts de Imagem
 * ============================================================
 * Lê o relatório de auditoria e gera/exporta prompts para IA
 * em múltiplos formatos. Permite filtrar por categoria, lote,
 * status de imagem ou SKU específico.
 *
 * Uso:
 *   cd scripts && npx tsx generate-image-prompts.ts
 *   npx tsx generate-image-prompts.ts --batch 1
 *   npx tsx generate-image-prompts.ts --category sex-shop
 *   npx tsx generate-image-prompts.ts --status SEM_IMAGEM
 *   npx tsx generate-image-prompts.ts --sku 3104000004755
 *   npx tsx generate-image-prompts.ts --batch 1 --format txt
 */

import fs   from 'fs';
import path from 'path';

const ROOT    = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'reports');
const BATCHES = path.join(REPORTS, 'image-batches');

// ── CLI args ─────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag: string): string | null {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const filterBatch    = getArg('--batch');
const filterCategory = getArg('--category');
const filterStatus   = getArg('--status');
const filterSku      = getArg('--sku');
const outputFormat   = getArg('--format') ?? 'all';  // all | json | csv | txt | md

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
  totalItems:   number;
  createdAt:    string;
  status:       string;
  items:        QueueItem[];
}

// ── Load data ──────────────────────────────────────────────────
function loadQueue(): QueueItem[] {
  const queuePath = path.join(REPORTS, 'image-generation-queue.json');
  if (!fs.existsSync(queuePath)) {
    console.error('❌ Arquivo não encontrado: reports/image-generation-queue.json');
    console.error('   Execute primeiro: npx tsx audit-catalog.ts');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(queuePath, 'utf-8')) as QueueItem[];
}

function loadBatch(batchNumber: number): QueueItem[] {
  const file = path.join(BATCHES, `batch-${String(batchNumber).padStart(3, '0')}.json`);
  if (!fs.existsSync(file)) {
    console.error(`❌ Lote não encontrado: reports/image-batches/batch-${String(batchNumber).padStart(3, '0')}.json`);
    process.exit(1);
  }
  const batch = JSON.parse(fs.readFileSync(file, 'utf-8')) as BatchFile;
  return batch.items;
}

// ── Filter ────────────────────────────────────────────────────
function applyFilters(items: QueueItem[]): QueueItem[] {
  let result = items;

  if (filterCategory) {
    result = result.filter(i => i.category === filterCategory || i.subcategory === filterCategory);
    console.log(`  Filtro categoria: "${filterCategory}" → ${result.length} produtos`);
  }

  if (filterStatus) {
    result = result.filter(i => i.imageStatus === filterStatus || i.status === filterStatus);
    console.log(`  Filtro status: "${filterStatus}" → ${result.length} produtos`);
  }

  if (filterSku) {
    result = result.filter(i => i.sku === filterSku || i.productId === filterSku);
    console.log(`  Filtro SKU/ID: "${filterSku}" → ${result.length} produtos`);
  }

  return result;
}

// ── Formatters ────────────────────────────────────────────────
function csvEscape(value: string): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeJson(items: QueueItem[], outPath: string) {
  const output = {
    generatedAt: new Date().toISOString(),
    totalItems:  items.length,
    filters: { batch: filterBatch, category: filterCategory, status: filterStatus, sku: filterSku },
    items: items.map((i, idx) => ({
      index:           idx + 1,
      productId:       i.productId,
      sku:             i.sku,
      productName:     i.productName,
      category:        i.category,
      subcategory:     i.subcategory,
      color:           i.color,
      flavor:          i.flavor,
      imageStatus:     i.imageStatus,
      desiredFileName: i.desiredFileName,
      prompt:          i.generatedPrompt,
    })),
  };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ JSON de prompts gravado: ${path.relative(ROOT, outPath)}`);
}

function writeCsv(items: QueueItem[], outPath: string) {
  const header = 'index,productId,sku,productName,category,subcategory,color,flavor,imageStatus,desiredFileName,prompt';
  const rows   = items.map((i, idx) =>
    [
      idx + 1,
      i.productId,
      i.sku,
      csvEscape(i.productName),
      i.category,
      i.subcategory,
      i.color,
      i.flavor,
      i.imageStatus,
      i.desiredFileName,
      csvEscape(i.generatedPrompt),
    ].join(',')
  );
  fs.writeFileSync(outPath, [header, ...rows].join('\n'), 'utf-8');
  console.log(`✅ CSV de prompts gravado:  ${path.relative(ROOT, outPath)}`);
}

function writeTxt(items: QueueItem[], outPath: string) {
  const lines: string[] = [
    `KA Bijoux — Prompts para Geração de Imagens`,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    `Total: ${items.length} prompts`,
    '='.repeat(80),
    '',
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    lines.push(`[${String(i + 1).padStart(4, '0')}] ARQUIVO: ${item.desiredFileName}`);
    lines.push(`       PRODUTO: ${item.productName}`);
    if (item.variation) lines.push(`       VARIAÇÃO: ${item.variation}`);
    lines.push(`       STATUS:  ${item.imageStatus}`);
    lines.push('');
    lines.push(`PROMPT:`);
    lines.push(item.generatedPrompt);
    lines.push('');
    lines.push('-'.repeat(80));
    lines.push('');
  }

  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`✅ TXT de prompts gravado:  ${path.relative(ROOT, outPath)}`);
}

function writeMd(items: QueueItem[], outPath: string) {
  const lines: string[] = [
    '# KA Bijoux — Prompts para Geração de Imagens',
    '',
    `**Gerado em:** ${new Date().toLocaleString('pt-BR')}  `,
    `**Total:** ${items.length} produtos`,
    '',
  ];

  if (filterBatch)    lines.push(`**Lote:** ${filterBatch}  `);
  if (filterCategory) lines.push(`**Categoria:** ${filterCategory}  `);
  if (filterStatus)   lines.push(`**Status:** ${filterStatus}  `);

  lines.push('', '---', '');

  // Group by category
  const byCategory = new Map<string, QueueItem[]>();
  for (const item of items) {
    const key = item.categoryName || item.category;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(item);
  }

  for (const [catName, catItems] of byCategory) {
    lines.push(`## ${catName} (${catItems.length})`);
    lines.push('');

    for (let i = 0; i < catItems.length; i++) {
      const item = catItems[i];
      lines.push(`### ${i + 1}. ${item.productName}`);
      lines.push('');
      lines.push(`| Campo | Valor |`);
      lines.push(`|-------|-------|`);
      lines.push(`| SKU   | \`${item.sku}\` |`);
      lines.push(`| Arquivo desejado | \`${item.desiredFileName}\` |`);
      lines.push(`| Status atual | \`${item.imageStatus}\` |`);
      if (item.color)  lines.push(`| Cor   | ${item.color} |`);
      if (item.flavor) lines.push(`| Sabor | ${item.flavor} |`);
      lines.push('');
      lines.push('**Prompt:**');
      lines.push('');
      lines.push(`> ${item.generatedPrompt}`);
      lines.push('');
    }
  }

  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`✅ Markdown gravado:        ${path.relative(ROOT, outPath)}`);
}

// ── Main ───────────────────────────────────────────────────────
function main() {
  console.log('🖊️  KA Bijoux — Gerador de Prompts\n');

  let items: QueueItem[];

  if (filterBatch) {
    console.log(`📦 Carregando lote ${filterBatch}...`);
    items = loadBatch(parseInt(filterBatch, 10));
    console.log(`   ${items.length} itens no lote ${filterBatch}`);
  } else {
    console.log('📋 Carregando fila completa...');
    items = loadQueue();
    console.log(`   ${items.length} itens na fila`);
  }

  if (filterCategory || filterStatus || filterSku) {
    console.log('\n🔍 Aplicando filtros:');
    items = applyFilters(items);
  }

  if (items.length === 0) {
    console.log('\n⚠️  Nenhum produto encontrado com os filtros aplicados.');
    process.exit(0);
  }

  console.log(`\n📊 ${items.length} prompts para exportar\n`);
  fs.mkdirSync(REPORTS, { recursive: true });

  const suffix = [
    filterBatch    ? `lote${filterBatch}`   : '',
    filterCategory ? filterCategory         : '',
    filterStatus   ? filterStatus           : '',
    filterSku      ? `sku-${filterSku}`     : '',
  ].filter(Boolean).join('-') || 'completo';

  if (outputFormat === 'json' || outputFormat === 'all') {
    writeJson(items, path.join(REPORTS, `prompts-${suffix}.json`));
  }
  if (outputFormat === 'csv' || outputFormat === 'all') {
    writeCsv(items, path.join(REPORTS, `prompts-${suffix}.csv`));
  }
  if (outputFormat === 'txt' || outputFormat === 'all') {
    writeTxt(items, path.join(REPORTS, `prompts-${suffix}.txt`));
  }
  if (outputFormat === 'md' || outputFormat === 'all') {
    writeMd(items, path.join(REPORTS, `prompts-${suffix}.md`));
  }

  console.log('\n🏁 Prompts exportados com sucesso!');
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log(`  1. Abra reports/prompts-${suffix}.txt (mais fácil de copiar)`);
  console.log('  2. Copie cada prompt para DALL-E, Midjourney, Firefly ou similar');
  console.log('  3. Salve as imagens com o nome exato indicado em "ARQUIVO:"');
  console.log('  4. Coloque em generated-product-images/pending/');
  console.log('  5. Revise e mova para generated-product-images/approved/');
  console.log('  6. Execute: npx tsx import-generated-images.ts');
}

main();
