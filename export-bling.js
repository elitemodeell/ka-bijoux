const http = require('http');
const https = require('https');
const fs = require('fs');
const querystring = require('querystring');
const { exec } = require('child_process');

const CLIENT_ID = process.env.BLING_CLIENT_ID;
const CLIENT_SECRET = process.env.BLING_CLIENT_SECRET;
const REDIRECT_URI = process.env.BLING_REDIRECT_URI || 'http://localhost';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Configure BLING_CLIENT_ID e BLING_CLIENT_SECRET no ambiente antes de rodar.');
  process.exit(1);
}

const AUTH_URL = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&state=exportacao`;

function httpsRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
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
      'Authorization': `Basic ${credentials}`,
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
    process.stdout.write(`\rBuscando página ${page} — ${all.length} produtos...`);
    const result = await httpsRequest({
      hostname: 'www.bling.com.br',
      path: `/Api/v3/produtos?pagina=${page}&limite=100&criterio=1`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const items = result.data?.data;
    if (!items || items.length === 0) break;
    all.push(...items);
    if (items.length < 100) break;
    page++;
    await new Promise(r => setTimeout(r, 350));
  }
  return all;
}

function toCSV(products) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['id','nome','codigo','preco','situacao','tipo','unidade','estoque','categoria'];
  const rows = products.map(p => [
    p.id,
    esc(p.nome),
    esc(p.codigo),
    p.preco ?? '',
    p.situacao ?? '',
    p.tipo ?? '',
    esc(p.unidade),
    p.estoque?.saldoVirtualTotal ?? '',
    esc(p.categoria?.descricao)
  ].join(';'));
  return [headers.join(';'), ...rows].join('\n');
}

async function main() {
  console.log('Iniciando servidor local para capturar autorização...');

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const code = url.searchParams.get('code');

    if (!code) {
      res.writeHead(400);
      res.end('Código não encontrado');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Autorizado! Pode fechar esta aba. A exportação está rodando no terminal.</h2>');
    server.close();

    console.log('\nCódigo capturado! Obtendo token...');
    const token = await getToken(code);
    console.log('Token OK! Buscando produtos...');
    const products = await getProducts(token);
    console.log(`\n\nTotal: ${products.length} produtos`);
    const csv = toCSV(products);
    const file = 'produtos-bling.csv';
    fs.writeFileSync(file, '﻿' + csv, 'utf8');
    console.log(`\nExportado com sucesso: ${file}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EACCES') {
      console.error('\nErro: porta 80 requer permissão de administrador.');
      console.error('Abra o terminal como Administrador e rode novamente.');
    } else {
      console.error('Erro no servidor:', err.message);
    }
    process.exit(1);
  });

  server.listen(80, () => {
    console.log('Servidor OK. Abrindo navegador para autorização...');
    exec(`start "" "${AUTH_URL}"`);
    console.log('\nAutorize o app no navegador. Aguardando...');
  });
}

main().catch(console.error);
