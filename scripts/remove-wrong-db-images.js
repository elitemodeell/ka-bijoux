/**
 * remove-wrong-db-images.js
 *
 * Remove do banco os registros ProductImage que apontam para
 * arquivos adultos mas estão associados a produtos NÃO adultos.
 *
 * Uso:
 *   node scripts/remove-wrong-db-images.js          # dry-run
 *   node scripts/remove-wrong-db-images.js --execute # remove do banco
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--execute');

// Filenames que têm conteúdo adulto mas foram usados em produtos não adultos
// (Toda a pasta 'produtos atualizados' era adulta, mas o mapeamento usou para produtos comuns)
const WRONG_FILENAMES = new Set([
  'cachecol-xadrez-3104000004763.jpg',
  'cachecol-liso-pompom-3104000004762.jpg',
  'cachecol-xadrez-premium-3104000004761.jpg',
  'case-ip-16e-cor-branco.jpg',
  'case-ip-16e-cor-rosa.jpg',
  'case-ip-16e-cor-vermelho.jpg',
  'case-ip-16e-cor-preto.jpg',
  'conjunto-colar-brinco-brasil-3104000004734.jpg',
  'cachecol-liso-3104000004733.jpg',
  'broche-do-brasil-3104000004732.jpg',
  'bracelete-do-brasil-3104000004731.jpg',
  'pulseira-missanga-do-brasil-3104000004730.jpg',
  'faixa-brasil-3104000004729.jpg',
  'adesivo-brasil-3104000004728.jpg',
  'bota-de-chuva-para-tenis-3104000004689.jpg',
  'pulseira-premium-3104000004687.jpg',
  'laco-brasil-3104000004686.jpg',
  'carimbo-de-francesinha-3104000004685.jpg',
  'vale-presente-50-00-3104000004684.jpg',
  'vale-presente-200-00-3104000004683.jpg',
  'vale-presente-100-00-3104000004682.jpg',
  'tapete-escorredor-de-copos-3104000004681.jpg',
  'calcinha-com-cinta-3104000004680.jpg',
  'vaso-decorativo-60-00-3104000004679.jpg',
  'vaso-decorativo-72-00-3104000004678.jpg',
  'chinelo-havaianas-branca-3104000004676.jpg',
  'cesta-dia-dos-namorados-3104000004677.jpg',
  'chinelo-de-time-3104000004675.jpg',
  'colar-couro-comprido-3104000004674.jpg',
  'escova-eletrica-de-dente-3104000004673.jpg',
  'escova-finalizadora-para-cabelo-3104000004672.jpg',
  'pente-airbag-massage-comb-3104000004671.jpg',
  'pulseira-casal-3104000004670.jpg',
  'oleo-hidratante-de-cuticula-3104000004669.jpg',
  'blush-bobbi-rara-3104000004668.jpg',
  'algodao-demaquilante-miamake-3104000004667.jpg',
  'progressiva-de-chuveiro-sache-3104000004666.jpg',
  'creme-facial-noturno-3104000004665.jpg',
]);

function filenameFromUrl(url) {
  return (url || '').split('/').pop();
}

async function main() {
  console.log(`\n=== remove-wrong-db-images.js — ${DRY_RUN ? 'DRY RUN' : '*** EXECUÇÃO REAL ***'} ===\n`);

  // Buscar todas as imagens de produtos NÃO adultos
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
          category: { select: { slug: true } },
        },
      },
    },
  });

  console.log(`Total de imagens em produtos não adultos: ${allImages.length}`);

  const wrongImages = allImages.filter(img => WRONG_FILENAMES.has(filenameFromUrl(img.url)));

  if (wrongImages.length === 0) {
    console.log('\n✅ Nenhuma imagem errada encontrada no banco. Já está limpo.\n');
    return;
  }

  console.log(`\n⚠️  ${wrongImages.length} imagem(ns) com conteúdo adulto errado em produtos comuns:\n`);
  for (const img of wrongImages) {
    const fn = filenameFromUrl(img.url);
    const cat = img.product.category?.slug ?? '(sem cat)';
    console.log(`  [${img.id}] ${img.product.name} (${cat})`);
    console.log(`       Arquivo: ${fn}`);
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: nada removido. Rode com --execute para remover. ---\n');
    return;
  }

  const ids = wrongImages.map(img => img.id);
  const result = await prisma.productImage.deleteMany({ where: { id: { in: ids } } });
  console.log(`\n✅ ${result.count} registro(s) removido(s) do banco.`);
  console.log('Os produtos afetados agora ficarão sem imagem até que novas imagens corretas sejam adicionadas.\n');
}

main()
  .catch(e => { console.error('Erro fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
