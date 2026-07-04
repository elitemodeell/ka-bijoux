const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const { exec } = require('child_process');

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

loadEnvFile(path.join(process.cwd(), '.env.local'));

const CLIENT_ID = process.env.BLING_CLIENT_ID;
const CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
const REDIRECT_URI = process.env.BLING_REDIRECT_URI || 'http://localhost:3007';
const REDIRECT_URL = new URL(REDIRECT_URI);
const LISTEN_PORT = Number(REDIRECT_URL.port || (REDIRECT_URL.protocol === 'https:' ? 443 : 80));

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET no .env.local antes de rodar.');
  process.exit(1);
}

const AUTH_URL = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${encodeURIComponent(CLIENT_ID)}&state=exportacao`;

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

async function getToken(code) {
  const body = querystring.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI
  });
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
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
    console.error('\nErro ao obter token:', JSON.stringify(result.data));
    process.exit(1);
  }

  return result.data.access_token;
}

async function getProducts(token) {
  const all = [];
  let page = 1;

  while (true) {
    process.stdout.write(`\rBuscando pagina ${page} - ${all.length} produtos...`);
    const result = await httpsRequest({
      hostname: 'www.bling.com.br',
      path: `/Api/v3/produtos?pagina=${page}&limite=100&criterio=1`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });

    const items = result.data?.data;
    if (!items || items.length === 0) break;

    all.push(...items);
    if (items.length < 100) break;

    page++;
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  return all;
}

function toCSV(products) {
  const esc = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const headers = ['id', 'nome', 'codigo', 'preco', 'situacao', 'tipo', 'unidade', 'estoque', 'categoria'];
  const rows = products.map(product => [
    product.id,
    esc(product.nome),
    esc(product.codigo),
    product.preco ?? '',
    product.situacao ?? '',
    product.tipo ?? '',
    esc(product.unidade),
    product.estoque?.saldoVirtualTotal ?? '',
    esc(product.categoria?.descricao)
  ].join(';'));

  return [headers.join(';'), ...rows].join('\n');
}

async function main() {
  console.log('Iniciando servidor local para capturar autorizacao...');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    const code = url.searchParams.get('code');

    if (!code) {
      res.writeHead(400);
      res.end('Codigo nao encontrado');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Autorizado! Pode fechar esta aba. A exportacao esta rodando no terminal.</h2>');
    server.close();

    console.log('\nCodigo capturado! Obtendo token...');
    const token = await getToken(code);
    console.log('Token OK! Buscando produtos...');
    const products = await getProducts(token);
    console.log(`\n\nTotal: ${products.length} produtos`);

    const csv = toCSV(products);
    const file = 'produtos-bling.csv';
    fs.writeFileSync(file, `\uFEFF${csv}`, 'utf8');
    console.log(`\nExportado com sucesso: ${file}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EACCES') {
      console.error(`\nErro: porta ${LISTEN_PORT} requer permissao de administrador.`);
      console.error('Troque BLING_REDIRECT_URI para uma porta livre, como http://localhost:3007.');
    } else {
      console.error('Erro no servidor:', err.message);
    }
    process.exit(1);
  });

  server.listen(LISTEN_PORT, () => {
    console.log(`Servidor OK em ${REDIRECT_URI}. Abrindo navegador para autorizacao...`);
    exec(`start "" "${AUTH_URL}"`);
    console.log('\nAutorize o app no navegador. Aguardando...');
  });
}

main().catch(console.error);
