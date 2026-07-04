/**
 * KA Bijoux — Importador de Imagens Geradas
 * ============================================================
 * Copia imagens da pasta approved/ para o diretório de uploads
 * do Next.js, atualiza o arquivo de mapeamento, e move os
 * arquivos importados para imported/.
 *
 * FLUXO ESPERADO:
 *   generated-product-images/
 *     pending/   ← você coloca as imagens geradas aqui
 *     approved/  ← você move as que aprovou para cá
 *     rejected/  ← você move as que rejeitou para cá
 *     imported/  ← o script move automaticamente após importar
 *
 * Uso:
 *   cd scripts && npx tsx import-generated-images.ts
 *   npx tsx import-generated-images.ts --dry-run   (simula sem copiar)
 *   npx tsx import-generated-images.ts --force     (substitui existentes)
 */

import fs   from 'fs';
import path from 'path';

const ROOT     = path.resolve(__dirname, '..');
const BACKEND  = path.join(ROOT, 'backend');
const DATA     = path.join(BACKEND, 'data');
const UPLOADS  = path.join(BACKEND, 'public', 'uploads', 'products');
const GEN_DIR  = path.join(ROOT, 'generated-product-images');
const APPROVED = path.join(GEN_DIR, 'approved');
const IMPORTED = path.join(GEN_DIR, 'imported');
const REPORTS  = path.join(ROOT, 'reports');
const MAPPING_FILE = path.join(DATA, 'mapeamento-imagens-produtos.json');

// ── CLI args ─────────────────────────────────────────────────
const args   = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE   = args.includes('--force');

// ── Types ─────────────────────────────────────────────────────
interface QueueItem {
  productId:       string;
  sku:             string;
  productName:     string;
  category:        string;
  subcategory:     string;
  desiredFileName: string;
  imageStatus:     string;
  generatedPrompt: string;
}

interface MappingEntry {
  src:  string;
  nome: string;
  id:   string | null;
  sku:  string | null;
  obs?: string;
}

interface ImportResult {
  filename:    string;
  productId:   string;
  sku:         string;
  productName: string;
  action:      'IMPORTED' | 'SKIPPED_EXISTS' | 'SKIPPED_UNKNOWN' | 'ERROR';
  message:     string;
}

// ── Load queue ─────────────────────────────────────────────────
function loadQueue(): Map<string, QueueItem> {
  const queuePath = path.join(REPORTS, 'image-generation-queue.json');
  if (!fs.existsSync(queuePath)) {
    console.error('❌ Fila não encontrada: reports/image-generation-queue.json');
    console.error('   Execute primeiro: npx tsx audit-catalog.ts');
    process.exit(1);
  }
  const items = JSON.parse(fs.readFileSync(queuePath, 'utf-8')) as QueueItem[];
  const map   = new Map<string, QueueItem>();
  for (const item of items) {
    map.set(item.desiredFileName.toLowerCase(), item);
  }
  return map;
}

// ── Load mapping ───────────────────────────────────────────────
function loadMapping(): MappingEntry[] {
  if (!fs.existsSync(MAPPING_FILE)) return [];
  return JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8')) as MappingEntry[];
}

// ── Ensure dirs ────────────────────────────────────────────────
function ensureDirs() {
  for (const dir of [APPROVED, IMPORTED, UPLOADS]) {
    if (!fs.existsSync(dir)) {
      if (!DRY_RUN) fs.mkdirSync(dir, { recursive: true });
      console.log(`  📁 ${DRY_RUN ? '[DRY] ' : ''}Criado: ${path.relative(ROOT, dir)}`);
    }
  }
}

// ── Main ───────────────────────────────────────────────────────
function main() {
  console.log(`🚀 KA Bijoux — Importador de Imagens Geradas${DRY_RUN ? ' [DRY RUN]' : ''}\n`);
  ensureDirs();

  if (!fs.existsSync(APPROVED)) {
    console.error('❌ Pasta approved/ não encontrada.');
    console.error('   Crie: generated-product-images/approved/');
    console.error('   Mova suas imagens aprovadas para lá antes de executar.');
    process.exit(1);
  }

  const approvedFiles = fs.readdirSync(APPROVED).filter(f =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );

  if (approvedFiles.length === 0) {
    console.log('⚠️  Nenhuma imagem encontrada em generated-product-images/approved/');
    console.log('   Adicione imagens aprovadas antes de executar o importador.');
    process.exit(0);
  }

  console.log(`📂 Imagens em approved/: ${approvedFiles.length}\n`);

  const queue   = loadQueue();
  const mapping = loadMapping();
  const results: ImportResult[] = [];

  for (const filename of approvedFiles) {
    const key  = filename.toLowerCase();
    const item = queue.get(key);
    const src  = path.join(APPROVED, filename);
    const dest = path.join(UPLOADS,  filename);

    if (!item) {
      // File doesn't match any queued product — add with unknown metadata
      results.push({
        filename,
        productId:   '',
        sku:         '',
        productName: '',
        action:      'SKIPPED_UNKNOWN',
        message:     'Arquivo não encontrado na fila de geração. Verifique o nome do arquivo.',
      });
      continue;
    }

    // Check if destination already exists
    if (fs.existsSync(dest) && !FORCE) {
      results.push({
        filename,
        productId:   item.productId,
        sku:         item.sku,
        productName: item.productName,
        action:      'SKIPPED_EXISTS',
        message:     'Imagem já existe em uploads/products/. Use --force para substituir.',
      });
      continue;
    }

    try {
      if (!DRY_RUN) {
        fs.copyFileSync(src, dest);
        fs.renameSync(src, path.join(IMPORTED, filename));
      }

      // Update mapping
      const existingMapping = mapping.findIndex(
        m => m.id === item.productId || m.sku === item.sku
      );

      const newEntry: MappingEntry = {
        src:  `/uploads/products/${filename}`,
        nome: filename,
        id:   item.productId || null,
        sku:  item.sku || null,
        obs:  `Gerado por IA — ${new Date().toISOString().split('T')[0]}`,
      };

      if (existingMapping !== -1) {
        mapping[existingMapping] = newEntry;
      } else {
        mapping.push(newEntry);
      }

      results.push({
        filename,
        productId:   item.productId,
        sku:         item.sku,
        productName: item.productName,
        action:      'IMPORTED',
        message:     `Copiado para uploads/products/${filename}`,
      });
    } catch (err) {
      results.push({
        filename,
        productId:   item.productId,
        sku:         item.sku,
        productName: item.productName,
        action:      'ERROR',
        message:     String(err),
      });
    }
  }

  // Save updated mapping
  if (!DRY_RUN) {
    const imported = results.filter(r => r.action === 'IMPORTED');
    if (imported.length > 0) {
      fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2), 'utf-8');
      console.log(`✅ Mapeamento atualizado: backend/data/mapeamento-imagens-produtos.json`);
    }
  }

  // ── Print results ──────────────────────────────────────────
  const grouped = {
    IMPORTED:         results.filter(r => r.action === 'IMPORTED'),
    SKIPPED_EXISTS:   results.filter(r => r.action === 'SKIPPED_EXISTS'),
    SKIPPED_UNKNOWN:  results.filter(r => r.action === 'SKIPPED_UNKNOWN'),
    ERROR:            results.filter(r => r.action === 'ERROR'),
  };

  console.log('\n📊 RESULTADO DA IMPORTAÇÃO\n' + '─'.repeat(50));
  console.log(`✅ Importados:       ${grouped.IMPORTED.length}`);
  console.log(`⏭  Já existia:      ${grouped.SKIPPED_EXISTS.length}`);
  console.log(`❓ Arquivo unknown:  ${grouped.SKIPPED_UNKNOWN.length}`);
  console.log(`❌ Erros:           ${grouped.ERROR.length}`);

  if (grouped.IMPORTED.length > 0) {
    console.log('\n✅ IMPORTADOS:');
    for (const r of grouped.IMPORTED) {
      const flag = DRY_RUN ? '[DRY] ' : '';
      console.log(`  ${flag}${r.filename}`);
      if (r.productName) console.log(`         → ${r.productName} (SKU: ${r.sku})`);
    }
  }

  if (grouped.SKIPPED_UNKNOWN.length > 0) {
    console.log('\n❓ NÃO ENCONTRADOS NA FILA (verifique o nome do arquivo):');
    for (const r of grouped.SKIPPED_UNKNOWN) {
      console.log(`  ${r.filename}`);
    }
    console.log('  Dica: o nome do arquivo deve ser exatamente o valor "desiredFileName" da fila.');
  }

  if (grouped.ERROR.length > 0) {
    console.log('\n❌ ERROS:');
    for (const r of grouped.ERROR) {
      console.log(`  ${r.filename}: ${r.message}`);
    }
  }

  // ── Save import report ─────────────────────────────────────
  const reportPath = path.join(REPORTS, 'import-report.json');
  const report = {
    importedAt:      new Date().toISOString(),
    dryRun:          DRY_RUN,
    totalProcessed:  results.length,
    totalImported:   grouped.IMPORTED.length,
    totalSkipped:    grouped.SKIPPED_EXISTS.length + grouped.SKIPPED_UNKNOWN.length,
    totalErrors:     grouped.ERROR.length,
    results,
  };

  if (!DRY_RUN) {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n📋 Relatório de importação: reports/import-report.json`);
  }

  console.log('\n🏁 Importação concluída!');

  if (grouped.IMPORTED.length > 0 && !DRY_RUN) {
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('  1. Execute a auditoria novamente para atualizar o status:');
    console.log('     npx tsx audit-catalog.ts');
    console.log('  2. Valide as imagens importadas:');
    console.log('     npx tsx validate-product-images.ts');
    console.log('  3. Continue com o próximo lote de geração de imagens.');
  }
}

main();
