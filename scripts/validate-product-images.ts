/**
 * KA Bijoux — Validação de Imagens de Produtos
 * ============================================================
 * Valida o estado atual das imagens após importações, identifica
 * o que ainda está pendente e calcula o progresso geral.
 *
 * Uso:
 *   cd scripts && npx tsx validate-product-images.ts
 *   npx tsx validate-product-images.ts --category sex-shop
 *   npx tsx validate-product-images.ts --only-missing
 *   npx tsx validate-product-images.ts --compare-audit
 */

import fs   from 'fs';
import path from 'path';

const ROOT     = path.resolve(__dirname, '..');
const BACKEND  = path.join(ROOT, 'backend');
const DATA     = path.join(BACKEND, 'data');
const UPLOADS  = path.join(BACKEND, 'public', 'uploads', 'products');
const GEN_DIR  = path.join(ROOT, 'generated-product-images');
const REPORTS  = path.join(ROOT, 'reports');

// ── CLI args ─────────────────────────────────────────────────
const args         = process.argv.slice(2);
function getArg(flag: string): string | null {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}
const filterCategory  = getArg('--category');
const onlyMissing     = args.includes('--only-missing');
const compareAudit    = args.includes('--compare-audit');

// ── Types ─────────────────────────────────────────────────────
interface AuditProduct {
  productId:       string;
  sku:             string;
  productName:     string;
  category:        string;
  categoryName:    string;
  subcategory:     string;
  subcategoryName: string;
  price:           number;
  stock:           number;
  color:           string;
  flavor:          string;
  currentImage:    string;
  imageStatus:     string;
  desiredFileName: string;
  generatedPrompt: string;
}

interface AuditFile {
  summary:  Record<string, number | string>;
  products: AuditProduct[];
}

interface QueueItem {
  productId:       string;
  sku:             string;
  productName:     string;
  category:        string;
  categoryName:    string;
  subcategory:     string;
  imageStatus:     string;
  desiredFileName: string;
  status:          string;
  stock:           number;
  price:           number;
  color:           string;
  flavor:          string;
}

interface ValidationResult {
  productId:       string;
  sku:             string;
  productName:     string;
  category:        string;
  imageStatus:     string;
  desiredFileName: string;
  existsInUploads: boolean;
  existsInApproved:boolean;
  existsInPending: boolean;
  existsInImported:boolean;
  stock:           number;
  validationStatus:'OK' | 'MISSING_FILE' | 'IN_PENDING' | 'IN_APPROVED' | 'IN_IMPORTED';
}

// ── Load ───────────────────────────────────────────────────────
function loadAudit(): AuditFile | null {
  const p = path.join(REPORTS, 'product-image-audit.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as AuditFile;
}

function loadQueue(): QueueItem[] {
  const p = path.join(REPORTS, 'image-generation-queue.json');
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as QueueItem[];
}

function getDirFiles(dir: string): Set<string> {
  if (!fs.existsSync(dir)) return new Set();
  return new Set(fs.readdirSync(dir).map(f => f.toLowerCase()));
}

// ── Validators ────────────────────────────────────────────────
function checkImageIntegrity(filename: string): { size: number; valid: boolean } {
  const filePath = path.join(UPLOADS, filename);
  if (!fs.existsSync(filePath)) return { size: 0, valid: false };
  const stat = fs.statSync(filePath);
  return { size: stat.size, valid: stat.size > 1024 };  // at least 1KB
}

// ── Main ───────────────────────────────────────────────────────
function main() {
  console.log('🔎 KA Bijoux — Validação de Imagens de Produtos\n');

  const audit = loadAudit();
  const queue = loadQueue();

  if (!audit && queue.length === 0) {
    console.error('❌ Nenhum relatório de auditoria encontrado.');
    console.error('   Execute primeiro: npx tsx audit-catalog.ts');
    process.exit(1);
  }

  // Scan all directories
  const uploadsFiles  = getDirFiles(UPLOADS);
  const pendingFiles  = getDirFiles(path.join(GEN_DIR, 'pending'));
  const approvedFiles = getDirFiles(path.join(GEN_DIR, 'approved'));
  const importedFiles = getDirFiles(path.join(GEN_DIR, 'imported'));
  const rejectedFiles = getDirFiles(path.join(GEN_DIR, 'rejected'));

  console.log('📁 Estado das pastas:');
  console.log(`   uploads/products/:                  ${uploadsFiles.size} arquivos`);
  console.log(`   generated-product-images/pending/:  ${pendingFiles.size} arquivos`);
  console.log(`   generated-product-images/approved/: ${approvedFiles.size} arquivos`);
  console.log(`   generated-product-images/imported/: ${importedFiles.size} arquivos`);
  console.log(`   generated-product-images/rejected/: ${rejectedFiles.size} arquivos\n`);

  // Validate queue items
  let items = queue;
  if (filterCategory) {
    items = items.filter(i => i.category === filterCategory || i.subcategory === filterCategory);
    console.log(`🔍 Filtro: categoria "${filterCategory}" → ${items.length} itens\n`);
  }

  if (items.length === 0) {
    console.log('⚠️  Nenhum item na fila de geração.');
    if (audit) {
      console.log(`   Total de produtos no catálogo: ${audit.products.length}`);
    }
    process.exit(0);
  }

  const results: ValidationResult[] = items.map(item => {
    const key              = item.desiredFileName.toLowerCase();
    const existsInUploads  = uploadsFiles.has(key);
    const existsInApproved = approvedFiles.has(key);
    const existsInPending  = pendingFiles.has(key);
    const existsInImported = importedFiles.has(key);

    let validationStatus: ValidationResult['validationStatus'] = 'MISSING_FILE';
    if      (existsInUploads)  validationStatus = 'OK';
    else if (existsInImported) validationStatus = 'IN_IMPORTED';  // moved but not in uploads?
    else if (existsInApproved) validationStatus = 'IN_APPROVED';
    else if (existsInPending)  validationStatus = 'IN_PENDING';

    return {
      productId:        item.productId,
      sku:              item.sku,
      productName:      item.productName,
      category:         item.categoryName || item.category,
      imageStatus:      item.imageStatus,
      desiredFileName:  item.desiredFileName,
      existsInUploads,
      existsInApproved,
      existsInPending,
      existsInImported,
      stock:            item.stock,
      validationStatus,
    };
  });

  // ── Stats ─────────────────────────────────────────────────
  const ok         = results.filter(r => r.validationStatus === 'OK');
  const missing    = results.filter(r => r.validationStatus === 'MISSING_FILE');
  const inApproved = results.filter(r => r.validationStatus === 'IN_APPROVED');
  const inPending  = results.filter(r => r.validationStatus === 'IN_PENDING');
  const inImported = results.filter(r => r.validationStatus === 'IN_IMPORTED');

  const total = results.length;
  const pct   = total > 0 ? ((ok.length / total) * 100).toFixed(1) : '0.0';
  const bar   = Math.round(ok.length / total * 40);

  console.log('📊 VALIDAÇÃO DA FILA DE GERAÇÃO\n' + '─'.repeat(50));
  console.log(`Total na fila de geração:  ${total}`);
  console.log('');
  console.log(`✅ OK (em uploads/):        ${ok.length}`);
  console.log(`🟡 Em approved/ (importar): ${inApproved.length}`);
  console.log(`🔵 Em pending/ (revisar):   ${inPending.length}`);
  console.log(`🟣 Em imported/ (verificar):${inImported.length}`);
  console.log(`❌ Ainda faltando:          ${missing.length}`);
  console.log('');
  console.log(`Progresso: [${'█'.repeat(bar)}${' '.repeat(40 - bar)}] ${pct}%`);

  // ── Category breakdown ─────────────────────────────────────
  if (!filterCategory) {
    console.log('\n📂 POR CATEGORIA (faltando):');
    const byCat = new Map<string, number>();
    for (const r of missing) {
      byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
    }
    const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cat, count] of sorted) {
      console.log(`   ${cat.padEnd(38)} ${count}`);
    }
  }

  // ── Items in approved (ready to import) ───────────────────
  if (inApproved.length > 0) {
    console.log(`\n🟡 EM APPROVED/ — PRONTO PARA IMPORTAR (${inApproved.length}):`);
    for (const r of inApproved.slice(0, 20)) {
      console.log(`   ${r.desiredFileName}`);
      console.log(`      → ${r.productName}`);
    }
    if (inApproved.length > 20) {
      console.log(`   ... e mais ${inApproved.length - 20} arquivos`);
    }
    console.log('\n   Execute: npx tsx import-generated-images.ts');
  }

  // ── Items in pending (need review) ─────────────────────────
  if (inPending.length > 0) {
    console.log(`\n🔵 EM PENDING/ — AGUARDANDO REVISÃO (${inPending.length}):`);
    for (const r of inPending.slice(0, 10)) {
      console.log(`   ${r.desiredFileName}`);
    }
    if (inPending.length > 10) {
      console.log(`   ... e mais ${inPending.length - 10} arquivos`);
    }
    console.log('\n   Revise as imagens e mova para approved/ ou rejected/');
  }

  // ── Missing items (top 20 by stock) ─────────────────────────
  if (missing.length > 0 && !onlyMissing === false || onlyMissing) {
    const byStock = missing.filter(r => r.stock > 0).sort((a, b) => b.stock - a.stock);
    console.log(`\n❌ FALTANDO — PRIORIDADE ESTOQUE (top 20):`);
    for (const r of byStock.slice(0, 20)) {
      console.log(`   [${String(r.stock).padStart(4)}] ${r.desiredFileName}`);
      console.log(`           ${r.productName}`);
    }
    if (byStock.length > 20) {
      console.log(`   ... e mais ${byStock.length - 20} produtos com estoque faltando`);
    }
  }

  // ── Integrity check for existing uploads ─────────────────
  if (compareAudit && ok.length > 0) {
    console.log('\n🔍 VERIFICANDO INTEGRIDADE DOS ARQUIVOS EM UPLOADS:');
    let corrupt = 0;
    for (const r of ok) {
      const check = checkImageIntegrity(r.desiredFileName);
      if (!check.valid) {
        console.log(`   ⚠️  ARQUIVO SUSPEITO (${check.size} bytes): ${r.desiredFileName}`);
        corrupt++;
      }
    }
    if (corrupt === 0) {
      console.log(`   ✅ Todos os ${ok.length} arquivos verificados parecem válidos (>1KB).`);
    } else {
      console.log(`\n   ⚠️  ${corrupt} arquivos suspeitos encontrados. Verifique manualmente.`);
    }
  }

  // ── Write validation report ───────────────────────────────
  fs.mkdirSync(REPORTS, { recursive: true });
  const reportPath = path.join(REPORTS, 'validation-report.json');
  const report = {
    validatedAt:     new Date().toISOString(),
    filter:          filterCategory ?? 'all',
    totalInQueue:    total,
    totalOk:         ok.length,
    totalInApproved: inApproved.length,
    totalInPending:  inPending.length,
    totalInImported: inImported.length,
    totalMissing:    missing.length,
    progressPercent: parseFloat(pct),
    results,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n📋 Relatório de validação: reports/validation-report.json`);

  // ── Summary & next steps ───────────────────────────────────
  console.log('\n🏁 Validação concluída!\n');

  if (missing.length === 0) {
    console.log('🎉 PARABÉNS! Todos os produtos da fila têm imagem em uploads/products/');
  } else {
    console.log('📋 PRÓXIMOS PASSOS:');
    if (inApproved.length > 0) {
      console.log(`  1. Importe as ${inApproved.length} imagens já aprovadas:`);
      console.log('     npx tsx import-generated-images.ts');
    }
    if (inPending.length > 0) {
      console.log(`  2. Revise as ${inPending.length} imagens em pending/ e mova para approved/`);
    }
    if (missing.length > 0) {
      const nextBatch = path.join(REPORTS, 'image-batches', 'batch-001.json');
      console.log(`  3. Continue gerando imagens (${missing.length} faltam)`);
      console.log('     npx tsx generate-image-prompts.ts --batch 1 --format txt');
    }
  }
}

main();
