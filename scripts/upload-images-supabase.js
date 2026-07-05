/**
 * upload-images-supabase.js
 *
 * Re-sobe todos os arquivos de /uploads/products/ para Supabase Storage,
 * com base no mapeamento (só arquivos listados no mapeamento).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const fs = require('fs');
const https = require('https');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
const UPLOADS_DIR = path.join(BACKEND_DIR, 'public', 'uploads', 'products');
const MAPEAMENTO_PATH = path.join(BACKEND_DIR, 'data', 'mapeamento-imagens-produtos.json');
const BUCKET = 'products';
const SUPABASE_PROJECT = 'sxohqngzypmxtmuulfoa';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLIC_BASE = `https://${SUPABASE_PROJECT}.supabase.co/storage/v1/object/public/${BUCKET}`;

function uploadToSupabase(filename, fileBuffer, mimeType) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${SUPABASE_PROJECT}.supabase.co`,
      path: `/storage/v1/object/${BUCKET}/${encodeURIComponent(filename)}`,
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length,
        'x-upsert': 'true',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(`${SUPABASE_PUBLIC_BASE}/${filename}`);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

async function main() {
  console.log(`\n=== upload-images-supabase.js ===`);
  console.log(`URL: ${process.env.SUPABASE_URL}`);
  console.log(`Bucket: ${BUCKET}\n`);

  const mapeamento = JSON.parse(fs.readFileSync(MAPEAMENTO_PATH, 'utf8'));
  const filenames = [...new Set(mapeamento.map(e => e.nome))];
  console.log(`Total de arquivos a fazer upload: ${filenames.length}\n`);

  let ok = 0;
  let erros = 0;

  for (const nome of filenames) {
    const localPath = path.join(UPLOADS_DIR, nome);
    if (!fs.existsSync(localPath)) {
      console.log(`  ⚠️  Arquivo local não encontrado: ${nome}`);
      erros++;
      continue;
    }

    try {
      const fileBuffer = fs.readFileSync(localPath);
      const ext = path.extname(nome).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

      await uploadToSupabase(nome, fileBuffer, contentType);
      console.log(`  ✅ ${nome}`);
      ok++;
    } catch (e) {
      console.log(`  ❌ ERRO ${nome}: ${e.message}`);
      erros++;
    }
  }

  console.log(`\n=== Resultado ===`);
  console.log(`  Upload OK: ${ok}`);
  console.log(`  Erros:     ${erros}`);
  console.log('');
}

main().catch(e => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
