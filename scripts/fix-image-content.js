/**
 * fix-image-content.js
 *
 * Copia as imagens corretas das pastas de Downloads para
 * backend/public/uploads/products/ e re-sobe para Supabase Storage.
 *
 * Uso:
 *   node scripts/fix-image-content.js           # dry-run
 *   node scripts/fix-image-content.js --execute  # copia + upload Supabase
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = !process.argv.includes('--execute');
const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
const UPLOADS_DIR = path.join(BACKEND_DIR, 'public', 'uploads', 'products');
const MAPEAMENTO_PATH = path.join(BACKEND_DIR, 'data', 'mapeamento-imagens-produtos.json');

// Todas as pastas onde podem estar os arquivos fonte
const SOURCE_DIRS = [
  'C:\\Users\\bruno\\Downloads\\produtos atualizados',
  'C:\\Users\\bruno\\Downloads\\produtos sex shop',
  'C:\\Users\\bruno\\Downloads\\produto lote 1',
  path.join(BACKEND_DIR, 'public', 'imagens', 'Bijoux'),
];

const SUPABASE_BUCKET = 'products';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function findSourceFile(srcName) {
  for (const dir of SOURCE_DIRS) {
    const full = path.join(dir, srcName);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

async function uploadToSupabase(localPath, destFilename) {
  const fileBuffer = fs.readFileSync(localPath);
  const contentType = 'image/jpeg'; // browsers handle PNG content with jpg ext fine
  const { error } = await getSupabase().storage
    .from(SUPABASE_BUCKET)
    .upload(destFilename, fileBuffer, {
      contentType,
      upsert: true,
    });
  if (error) throw error;
}

async function main() {
  console.log(`\n=== fix-image-content.js — ${DRY_RUN ? 'DRY RUN' : '*** EXECUÇÃO REAL ***'} ===\n`);

  const mapeamento = JSON.parse(fs.readFileSync(MAPEAMENTO_PATH, 'utf8'));
  console.log(`Entradas no mapeamento: ${mapeamento.length}\n`);

  let found = 0;
  let notFound = 0;
  const toProcess = [];

  for (const entry of mapeamento) {
    const srcPath = findSourceFile(entry.src);
    if (!srcPath) {
      console.log(`  ⚠️  NÃO ENCONTRADO: "${entry.src}"`);
      console.log(`       → destino seria: ${entry.nome}\n`);
      notFound++;
      continue;
    }

    const destPath = path.join(UPLOADS_DIR, entry.nome);
    toProcess.push({ srcPath, destPath, nome: entry.nome, srcName: entry.src });
    found++;
  }

  console.log(`\nFonte encontrada: ${found} / ${mapeamento.length}`);
  console.log(`Não encontrado:   ${notFound}\n`);

  if (toProcess.length === 0) {
    console.log('Nada a processar.');
    return;
  }

  console.log('Arquivos que serão copiados:');
  for (const item of toProcess) {
    console.log(`  ${item.nome}`);
    console.log(`    ← ${item.srcPath}`);
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: nenhuma alteração feita. Rode com --execute para aplicar. ---\n');
    return;
  }

  // Criar diretório de destino se não existir
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  let copied = 0;
  let uploaded = 0;
  let errors = 0;

  for (const item of toProcess) {
    try {
      // 1. Copiar localmente
      fs.copyFileSync(item.srcPath, item.destPath);
      copied++;
      console.log(`  ✅ Copiado: ${item.nome}`);

      // 2. Upload para Supabase Storage
      try {
        await uploadToSupabase(item.destPath, item.nome);
        uploaded++;
        console.log(`     ☁️  Supabase OK: ${item.nome}`);
      } catch (supaErr) {
        console.log(`     ⚠️  Supabase FALHOU para ${item.nome}: ${supaErr.message}`);
        errors++;
      }
    } catch (copyErr) {
      console.log(`  ❌ Erro ao copiar ${item.nome}: ${copyErr.message}`);
      errors++;
    }
  }

  console.log(`\n=== Resultado ===`);
  console.log(`  Copiados localmente: ${copied}`);
  console.log(`  Upload Supabase OK:  ${uploaded}`);
  console.log(`  Erros:               ${errors}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('Erro fatal:', e);
    process.exit(1);
  });
