/**
 * fix-wrong-images.js
 *
 * Detecta e remove imagens de produtos adultos indevidamente associadas
 * a produtos de categorias normais (bijuterias, moda, etc.)
 *
 * Uso:
 *   node scripts/fix-wrong-images.js          # dry-run — só lista, não remove
 *   node scripts/fix-wrong-images.js --execute # remove do banco
 *
 * Rodar com: NODE_PATH=./backend/node_modules node scripts/fix-wrong-images.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { PrismaClient } = require('@prisma/client');

const fs = require('fs');
const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--execute');

// Replica a lógica de isStrongAdultProductName de product-line.ts (sem TypeScript)
function isStrongAdultName(name) {
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!n) return false;
  if (/\b(infantil|crianca|criancas|anti acne|acne|sobrancelha|glitter|orbis|bolinha de gel|esfoliante|pedras vulcanicas)\b/.test(n)) return false;
  if (/\b(intimo|intima|lub|lubrificante|calcinha|vibrador|bullet|peniano|masturbador|algema|dedeira|tesao|pocao|garganta profunda|virginite|egg|pau de cavalo|dessensibilizante|excitante|anestesico|beijavel|plug|retardante|tapa mamilo|duelo|dados sexy|jogo do prazer)\b/.test(n)) return true;
  if (/\bgel\b/.test(n) && /\b(bala|ice|hot|excitant|sensual|massageador|comestivel|anestesico|dessensibilizante|anal|intimo|sex|sexy|masculino|sempre virgem|amoxsex|metioulate|rivosex|nabucetao|mete ficha|vamos ser feliz|fofatoba|pirocaxona|pirocadura|janumete|kama sutra|for sexy|bumbum|dando uma|come anel|ku loko|beijo grego)\b/.test(n)) return true;
  if (/\b(nabucetim|nocucedim|napepex|paracetaduro|pererecard|pirocadura|fofatoba|kama sutra|janumete|metioulate|rivosex|amoxsex|virginite|sempre virgem)\b/.test(n)) return true;
  return false;
}

// Constrói conjunto de filenames adultos a partir de bling-image-files.json
function buildAdultFilenames() {
  const imageFilesPath = path.join(BACKEND_DIR, 'data', 'bling-image-files.json');
  const files = JSON.parse(fs.readFileSync(imageFilesPath, 'utf8'));
  const set = new Set();
  for (const filename of files) {
    const lf = filename.toLowerCase();
    const nameFromFile = lf.replace(/\.[^.]+$/, '').replace(/-\d{10,}/g, '').replace(/-/g, ' ').trim();
    if (isStrongAdultName(nameFromFile)) set.add(lf);
  }
  return set;
}

const ADULT_FILENAMES = buildAdultFilenames();

function isAdultImageUrl(url) {
  const filename = (url || '').split('/').pop().toLowerCase();
  return ADULT_FILENAMES.has(filename);
}

async function main() {
  console.log(`\n=== fix-wrong-images.js — ${DRY_RUN ? 'DRY RUN (leitura apenas)' : '*** EXECUÇÃO REAL ***'} ===\n`);

  // Busca todas as imagens de produtos que NÃO são sex-shop
  const allImages = await prisma.productImage.findMany({
    where: {
      product: {
        category: { slug: { not: 'sex-shop' } },
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          category: { select: { slug: true, name: true } },
          subcategory: { select: { slug: true, name: true } },
        },
      },
    },
  });

  console.log(`Total de imagens em produtos não-adultos: ${allImages.length}`);

  const wrongImages = allImages.filter((img) => isAdultImageUrl(img.url));

  if (wrongImages.length === 0) {
    console.log('\n✅ Nenhuma imagem adulta encontrada em produtos normais. Catálogo limpo.\n');
    return;
  }

  console.log(`\n⚠️  ${wrongImages.length} imagem(ns) adulta(s) encontrada(s) em produtos não-adultos:\n`);

  for (const img of wrongImages) {
    const filename = img.url.split('/').pop();
    const cat = img.product.category?.slug ?? '(sem categoria)';
    console.log(`  [${img.id}]`);
    console.log(`    Produto : ${img.product.name} (${img.product.slug})`);
    console.log(`    Categoria: ${cat}`);
    console.log(`    Imagem adulta: ${filename}`);
    console.log(`    URL completa: ${img.url}`);
    console.log('');
  }

  if (DRY_RUN) {
    console.log('--- DRY RUN: nenhuma alteração feita. Rode com --execute para remover. ---\n');
    return;
  }

  // Executar remoção
  const ids = wrongImages.map((img) => img.id);
  console.log(`Removendo ${ids.length} registro(s) de ProductImage...`);

  const result = await prisma.productImage.deleteMany({
    where: { id: { in: ids } },
  });

  console.log(`\n✅ ${result.count} imagem(ns) removida(s) do banco com sucesso.`);
  console.log('Os produtos afetados agora usarão o fallback do catálogo Bling (ou ficarão sem imagem).\n');
}

main()
  .catch((e) => {
    console.error('Erro fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
