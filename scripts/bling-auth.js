const http = require('http');
const https = require('https');

const CLIENT_ID = 'a328177fa4108c47078a0f0eb17395ba29bdd6cb';
const CLIENT_SECRET = '795e2d2d93be82d84a902cd5958ae7f09a97424dfdc513c3ec2be73853f2';
const REDIRECT_URI = 'http://localhost:3007';

const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log('\n=== BLING OAUTH ===');
console.log('Abra esse link no navegador:');
console.log(authUrl);
console.log('\nAguardando autorização...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3007');
  const code = url.searchParams.get('code');

  if (!code) {
    res.end('Erro: sem codigo de autorização');
    return;
  }

  console.log('Código recebido! Trocando por token...');

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const body = `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  const tokenReq = https.request({
    hostname: 'www.bling.com.br',
    path: '/Api/v3/oauth/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    }
  }, (tokenRes) => {
    let data = '';
    tokenRes.on('data', d => data += d);
    tokenRes.on('end', async () => {
      const token = JSON.parse(data);
      if (!token.access_token) {
        console.log('Erro ao obter token:', data);
        res.end('Erro ao obter token');
        server.close();
        return;
      }

      console.log('\nToken obtido com sucesso!');

      // Buscar total de produtos
      let page = 1;
      let total = 0;
      let hasMore = true;

      while (hasMore) {
        const result = await fetchProducts(token.access_token, page);
        if (result.error || !result.data || result.data.length === 0) {
          hasMore = false;
        } else {
          total += result.data.length;
          console.log(`Página ${page}: ${result.data.length} produtos (total até agora: ${total})`);
          if (result.data.length < 100) hasMore = false;
          page++;
        }
        await sleep(300);
      }

      console.log(`\n============================`);
      console.log(`TOTAL DE PRODUTOS NO BLING: ${total}`);
      console.log(`============================\n`);
      console.log('ACCESS_TOKEN:', token.access_token);

      res.end(`<h1>Autorizado!</h1><p>Total de produtos no Bling: <b>${total}</b></p><p>Verifique o terminal.</p>`);
      server.close();
    });
  });
  tokenReq.write(body);
  tokenReq.end();
});

function fetchProducts(accessToken, page) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'www.bling.com.br',
      path: `/Api/v3/produtos?pagina=${page}&limite=100`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ error: true }); }
      });
    });
    req.on('error', () => resolve({ error: true }));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

server.listen(3007);
