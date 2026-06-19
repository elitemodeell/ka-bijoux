const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/bruno/Downloads/Bijoux';
const OUT = './backend/public/uploads/products';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Mapeamento: arquivo origem -> nome final -> id_bling e sku
const MAPA = [
  // Lote 17_20
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_40 (1).png',  nome: 'close-love-15g.png',                  id: null,          sku: null,                obs: 'Não encontrado no Bling' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_41 (2).png',  nome: 'desodorante-intimo-doce-paixao.png',  id: 16649309650,   sku: '3104000004310' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_41 (3).png',  nome: 'egg-silky.png',                       id: null,          sku: null,                obs: 'Não encontrado no Bling' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_42 (4).png',  nome: 'desodorante-intimo-tutti-frutti.png', id: 16649314550,   sku: '3104000004311' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_43 (5).png',  nome: 'desodorante-intimo-morango.png',      id: 16649327202,   sku: '3104000004313' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_43 (6).png',  nome: 'egg-stepper.png',                     id: 16665843407,   sku: '3104000004694' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_43 (7).png',  nome: 'egg-twister.png',                     id: 16516507187,   sku: '3104000000801' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_44 (8).png',  nome: 'egg-wavy.png',                        id: 16665844281,   sku: '3104000004695' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_45 (9).png',  nome: 'nabucetim-18ml.png',                  id: 16527790733,   sku: '3104000001491' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_20_45 (10).png', nome: 'nocucedim-18ml.png',                  id: 16527797757,   sku: '3104000001500' },

  // Lote 17_44 (versão melhorada dos géis)
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_45 (1).png',  nome: 'k-med-gel-intimo.png',                id: 16665871523,   sku: '3104000004698' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_45 (2).png',  nome: 'vamos-ser-feliz-gel.png',             id: 16665984372,   sku: '3104000004713' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_46 (3).png',  nome: 'rivosex-gel.png',                     id: 16665975199,   sku: '3104000004704' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_47 (4).png',  nome: 'pererecard-gel.png',                  id: 16665984866,   sku: '3104000004714' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_47 (5).png',  nome: 'pirocadura-gel.png',                  id: 16665980303,   sku: '3104000004709' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_48 (6).png',  nome: 'beijo-grego-gel.png',                 id: 16665978375,   sku: '3104000004707' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_49 (7).png',  nome: 'paracetaduro-gel.png',                id: 16665981972,   sku: '3104000004711' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_49 (8).png',  nome: 'pirocaexana-gel.png',                 id: null,          sku: null,                obs: 'Não encontrado no Bling' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_50 (9).png',  nome: 'janumete-gel.png',                    id: null,          sku: null,                obs: 'Não encontrado no Bling' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 17_44_50 (10).png', nome: 'anis-sex-gel.png',                    id: 16665977809,   sku: '3104000004706' },

  // Lote 19_52
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_41 (1).png',  nome: 'fofatoba-gel.png',                    id: 16665983308,   sku: '3104000004712' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_41 (2).png',  nome: 'kama-sutra-gel.png',                  id: 16665973621,   sku: '3104000004703' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_42 (3).png',  nome: 'hot-ice-gel.png',                     id: 16666181276,   sku: '3104000004719' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_42 (4).png',  nome: 'amoxsex-gel.png',                     id: null,          sku: null,                obs: 'Não encontrado no Bling' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_43 (5).png',  nome: 'virginite-gel.png',                   id: 16666189653,   sku: '3104000004727' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_44 (6).png',  nome: 'sempre-virgem-gel.png',               id: 16666181025,   sku: '3104000004718' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_45 (7).png',  nome: 'metioulate-gel.png',                  id: 16665975869,   sku: '3104000004705' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_46 (8).png',  nome: 'come-anel-gel.png',                   id: null,          sku: null,                obs: 'Não encontrado no Bling' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_47 (9).png',  nome: 'mete-ficha-gel.png',                  id: 16666180138,   sku: '3104000004715' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_52_49 (10).png', nome: 'dando-uma-gostoso-gel.png',           id: 16666185629,   sku: '3104000004723' },

  // Lote 19_57 (vibradores/controles)
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_57_40 (1).png',  nome: 'vibrador-sexy-controle-cores.png',    id: 16666351572,   sku: '3104000004755' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_57_40 (2).png',  nome: 'vibrador-golfinho-rosa.png',          id: 16666349946,   sku: '3104000004751' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 19_57_41 (3).png',  nome: 'anel-peniano-bolinha-cores.png',      id: 16666344242,   sku: '3104000004747' },

  // Lote 20_00 (mini bullets e aneis)
  { src: 'ChatGPT Image 18 de jun. de 2026, 20_00_32 (1).png',  nome: 'anel-peniano-orelha-cores.png',       id: 16666342223,   sku: '3104000004741' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 20_00_33 (2).png',  nome: 'anel-peniano-orelha-rosa-roxo.png',   id: 16666342377,   sku: '3104000004742' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 20_00_33 (3).png',  nome: 'mini-bullet-rosa-ponta-fina.png',     id: 16666357069,   sku: '3104000004760' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 20_00_34 (4).png',  nome: 'mini-bullet-duplo-linguinha.png',     id: 16666355912,   sku: '3104000004758' },
  { src: 'ChatGPT Image 18 de jun. de 2026, 20_00_34 (6).png',  nome: 'mini-bullet-duplo-rosa.png',          id: 16666356242,   sku: '3104000004759' },
];

function badgeSVG(size) {
  const bw = Math.round(size * 0.22);
  const bh = Math.round(size * 0.11);
  const x = size - bw - Math.round(size * 0.02);
  const y = Math.round(size * 0.02);
  const fontSize = Math.round(size * 0.065);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${Math.round(bh*0.2)}" fill="#EE4D2D"/>
  <text x="${x+bw/2}" y="${y+bh/2+1}" font-family="Arial Black,Arial,sans-serif" font-size="${fontSize}px" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="middle">-30%</text>
</svg>`;
}

async function process(item) {
  const srcPath = path.join(SRC, item.src);
  if (!fs.existsSync(srcPath)) { console.log(`  ⚠ Não encontrado: ${item.src}`); return; }

  const resized = await sharp(srcPath)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png().toBuffer();

  const badge = await sharp(Buffer.from(badgeSVG(800))).png().toBuffer();

  await sharp(resized)
    .composite([{ input: badge, top: 0, left: 0 }])
    .png({ quality: 90 })
    .toFile(path.join(OUT, item.nome));

  const status = item.id ? `✓ SKU ${item.sku}` : `⚠ Sem SKU (${item.obs})`;
  console.log(`  ${status} → ${item.nome}`);
}

async function main() {
  console.log(`Processando ${MAPA.length} imagens...\n`);
  for (const item of MAPA) await process(item);

  // Salvar mapeamento atualizado
  fs.writeFileSync('./mapeamento-imagens-produtos.json', JSON.stringify(MAPA, null, 2), 'utf8');
  console.log('\nMapeamento salvo: mapeamento-imagens-produtos.json');
  console.log('Imagens salvas em: backend/public/uploads/products/');

  const semSku = MAPA.filter(m => !m.id);
  if (semSku.length) {
    console.log(`\n⚠ ${semSku.length} produto(s) sem cadastro no Bling:`);
    semSku.forEach(m => console.log(`  - ${m.nome.replace('.png','').toUpperCase()}`));
  }
}

main().catch(console.error);
