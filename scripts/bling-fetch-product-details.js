const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { exec } = require('child_process');

const DEFAULT_CODES = [
  '3104000004938',
  '3104000004943',
  '3104000004945',
  '3104000005001',
  '3104000005002',
  '3104000005003',
  '3104000005005',
  '3104000005006',
  '3104000005007',
  '3104000005008',
  '3104000005009',
  '3104000005010',
  '3104000005011',
  '3104000005014',
  '3104000005015',
  '3104000005016',
  '3104000005017',
  '3104000005018'
];

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ';' && !quoted) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function readProductsCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(headerLine);

  return lines.map(line => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getToken({ clientId, clientSecret, redirectUri, port }) {
  const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}&state=detalhes`;

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, redirectUri);
      const code = url.searchParams.get('code');

      if (!code) {
        res.writeHead(400);
        res.end('Codigo nao encontrado');
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h2>Autorizado! Pode fechar esta aba.</h2>');
      server.close();

      try {
        const body = querystring.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        });
        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const result = await httpsRequest({
          hostname: 'www.bling.com.br',
          path: '/Api/v3/oauth/token',
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
          }
        }, body);

        if (!result.data.access_token) {
          reject(new Error(`Erro ao obter token: ${JSON.stringify(result.data)}`));
          return;
        }

        resolve(result.data.access_token);
      } catch (error) {
        reject(error);
      }
    });

    server.on('error', reject);
    server.listen(port, () => {
      console.log(`Servidor OK em ${redirectUri}. Abrindo autorizacao...`);
      exec(`start "" "${authUrl}"`);
    });
  });
}

function getByPath(object, pathParts) {
  let cursor = object;
  for (const part of pathParts) {
    if (cursor == null || typeof cursor !== 'object') return '';
    cursor = cursor[part];
  }
  return cursor ?? '';
}

function firstValue(object, paths) {
  for (const parts of paths) {
    const value = getByPath(object, parts);
    if (value !== '' && value !== null && value !== undefined) {
      return value;
    }
  }
  return '';
}

function inferTamanho(nome) {
  const upper = String(nome || '').toUpperCase();
  if (/\bPP\b/.test(upper)) return 'PP';
  if (/\bP\b/.test(upper)) return 'P';
  if (/\bM\b/.test(upper)) return 'M';
  if (/\bG\b/.test(upper)) return 'G';
  return '';
}

function esc(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function toDetailsCsv(rows) {
  const headers = [
    'codigo',
    'id',
    'nome',
    'preco',
    'estoque',
    'tamanho_no_nome',
    'altura',
    'largura',
    'profundidade',
    'peso_liquido',
    'peso_bruto',
    'status_detalhe'
  ];

  return [
    headers.join(';'),
    ...rows.map(row => headers.map(header => esc(row[header])).join(';'))
  ].join('\n');
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));

  const clientId = process.env.BLING_CLIENT_ID;
  const clientSecret = process.env.BLING_CLIENT_SECRET;
  const redirectUri = process.env.BLING_REDIRECT_URI || 'http://localhost:3007';
  const redirectUrl = new URL(redirectUri);
  const port = Number(redirectUrl.port || 80);

  if (!clientId || !clientSecret) {
    throw new Error('Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET no .env.local');
  }

  const codes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_CODES;
  const products = readProductsCsv(path.join(process.cwd(), 'produtos-bling.csv'));
  const byCode = new Map(products.map(product => [product.codigo, product]));
  const found = codes.map(code => byCode.get(code)).filter(Boolean);

  console.log(`Consultando detalhes de ${found.length} produtos encontrados por codigo...`);
  const token = await getToken({ clientId, clientSecret, redirectUri, port });
  const details = [];
  const rows = [];

  for (const product of found) {
    process.stdout.write(`\rBuscando ${product.codigo}...`);
    const result = await httpsRequest({
      hostname: 'www.bling.com.br',
      path: `/Api/v3/produtos/${product.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });

    const detail = result.data?.data ?? result.data;
    details.push({ code: product.codigo, id: product.id, status: result.status, detail });

    rows.push({
      codigo: product.codigo,
      id: product.id,
      nome: product.nome,
      preco: product.preco,
      estoque: product.estoque,
      tamanho_no_nome: inferTamanho(product.nome),
      altura: firstValue(detail, [['dimensoes', 'altura'], ['dimensao', 'altura'], ['altura']]),
      largura: firstValue(detail, [['dimensoes', 'largura'], ['dimensao', 'largura'], ['largura']]),
      profundidade: firstValue(detail, [['dimensoes', 'profundidade'], ['dimensoes', 'comprimento'], ['dimensao', 'profundidade'], ['comprimento'], ['profundidade']]),
      peso_liquido: firstValue(detail, [['pesoLiquido'], ['peso_liquido'], ['peso', 'liquido']]),
      peso_bruto: firstValue(detail, [['pesoBruto'], ['peso_bruto'], ['peso', 'bruto']]),
      status_detalhe: result.status
    });

    await new Promise(resolve => setTimeout(resolve, 250));
  }

  process.stdout.write('\n');

  const outDir = path.join(process.cwd(), 'reports', 'product-image-review-correct-folder-new');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'bling-product-details-raw.json'), JSON.stringify(details, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'bling-product-details.csv'), `\uFEFF${toDetailsCsv(rows)}`, 'utf8');

  console.log(`Detalhes salvos em ${path.join(outDir, 'bling-product-details.csv')}`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
