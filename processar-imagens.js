const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = './backend/public/imagens/produtos-whatsapp';
const OUTPUT_DIR = './backend/public/uploads/products';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const badgeSVG = (size, percent = '30') => {
  const bw = Math.round(size * 0.22);
  const bh = Math.round(size * 0.11);
  const x = size - bw - Math.round(size * 0.02);
  const y = Math.round(size * 0.02);
  const fontSize = Math.round(size * 0.065);
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${Math.round(bh * 0.2)}" fill="#EE4D2D"/>
  <text
    x="${x + bw / 2}" y="${y + bh / 2 + 1}"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${fontSize}px"
    font-weight="900"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >-${percent}%</text>
</svg>`;
};

async function processImage(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  const outputPath = path.join(OUTPUT_DIR, filename);

  const meta = await sharp(inputPath).metadata();
  const size = Math.min(meta.width, meta.height);
  const svg = Buffer.from(badgeSVG(size));

  const resized = await sharp(inputPath)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();

  const badge = await sharp(Buffer.from(badgeSVG(800, '30'))).png().toBuffer();

  await sharp(resized)
    .composite([{ input: badge, top: 0, left: 0 }])
    .png({ quality: 90 })
    .toFile(outputPath);

  console.log(`✓ ${filename}`);
}

async function main() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.png'));
  console.log(`Processando ${files.length} imagens...\n`);
  for (const file of files) {
    await processImage(file);
  }
  console.log(`\nPronto! Imagens salvas em: ${OUTPUT_DIR}`);
}

main().catch(console.error);
