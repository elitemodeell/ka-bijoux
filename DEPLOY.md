# KA Bijoux — Guia Completo de Deploy

> Siga esta ordem exata: GitHub → Supabase → Vercel → Testar

---

## PASSO 1 — GitHub: Criar repositório

### 1.1 Criar o repositório no GitHub

1. Acesse **github.com** e faça login
2. Clique em **"New repository"** (botão verde no canto superior direito)
3. Configure:
   - **Repository name:** `ka-bijoux-ecommerce`
   - **Description:** `E-commerce KA Bijoux — Itaúna/MG`
   - **Visibility:** `Private` (recomendado para projeto de cliente)
   - **NÃO** marque "Initialize this repository with a README"
4. Clique em **"Create repository"**

### 1.2 Conectar o repositório local ao GitHub

Abra o terminal na pasta do projeto (`c:\projeto\KA Bijoux`) e execute:

```bash
git remote add origin https://github.com/SEU_USUARIO/ka-bijoux-ecommerce.git
git branch -M main
git push -u origin main
```

> Substitua `SEU_USUARIO` pelo seu usuário do GitHub.

**Verificação:** Acesse `github.com/SEU_USUARIO/ka-bijoux-ecommerce` e confirme que os arquivos apareceram.

---

## PASSO 2 — Supabase: Criar banco de dados exclusivo

### 2.1 Criar o projeto no Supabase

1. Acesse **supabase.com** e faça login (ou crie uma conta gratuita)
2. Clique em **"New project"**
3. Configure:
   - **Organization:** selecione sua organização
   - **Project name:** `ka-bijoux`
   - **Database Password:** crie uma senha forte (guarde — você vai precisar dela!)
   - **Region:** `South America (São Paulo)` — mais próximo de Itaúna/MG
   - **Pricing plan:** Free tier é suficiente para começar
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos enquanto o banco é criado

### 2.2 Obter as URLs de conexão

Após o projeto ser criado:

1. Vá em **Settings** (ícone de engrenagem) → **Database**
2. Role até **"Connection string"**
3. Copie duas URLs:

**URL do Pooler (para DATABASE_URL):**
- Clique na aba **"Transaction"**
- Copie a URL (porta 6543)
- Exemplo: `postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`

**URL Direta (para DIRECT_URL):**
- Clique na aba **"Session"** ou **"Direct connection"**  
- Copie a URL (porta 5432)
- Exemplo: `postgresql://postgres:SENHA@db.xxxx.supabase.co:5432/postgres`

### 2.3 Configurar o arquivo .env

Na pasta `backend/`, crie o arquivo `.env`:

```bash
# No terminal, dentro de c:\projeto\KA Bijoux\backend\
copy .env.example .env
```

Abra o arquivo `backend/.env` e preencha:

```env
DATABASE_URL="postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:SENHA@db.xxxx.supabase.co:5432/postgres"

NEXTAUTH_SECRET="gere-aqui"
NEXTAUTH_URL="http://localhost:3000"

JWT_SECRET="outra-chave-secreta"
```

**Gerar secrets seguros:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Execute duas vezes — use um valor para `NEXTAUTH_SECRET` e outro para `JWT_SECRET`.

### 2.4 Instalar dependências e aplicar o schema

```bash
# Na pasta raiz do projeto (c:\projeto\KA Bijoux)
cd backend
npm install

# Aplicar o schema no banco Supabase
npm run db:push

# Popular com dados iniciais
npm run db:seed
```

**Verificação:** No Supabase, vá em **Table Editor** e confirme que as tabelas foram criadas:
- `admins`, `customers`, `products`, `categories`, `orders`, `carts`, `payments`, etc.

**Credenciais criadas pelo seed:**
- Admin: `admin@kabijoux.com.br` / `admin123`
- Cliente teste: `cliente@teste.com` / `cliente123`

---

## PASSO 3 — Vercel: Fazer o deploy

### 3.1 Criar conta e importar projeto

1. Acesse **vercel.com** e faça login com sua conta GitHub
2. Clique em **"Add New Project"**
3. Selecione o repositório `ka-bijoux-ecommerce`
4. Clique em **"Import"**

### 3.2 Configurar o projeto na Vercel

Na tela de configuração do projeto:

**Framework Preset:** `Next.js` (detectado automaticamente)

**Root Directory:**
- Clique em **"Edit"** ao lado de Root Directory
- Digite: `backend`
- Confirme

**Build & Output Settings** (deixar como padrão após setar o Root Directory):
- Build Command: `npm run build` ✓
- Output Directory: `.next` ✓
- Install Command: `npm install` ✓

### 3.3 Adicionar variáveis de ambiente na Vercel

Na seção **"Environment Variables"**, adicione uma por uma:

| Nome | Valor |
|------|-------|
| `DATABASE_URL` | URL do pooler do Supabase (porta 6543) |
| `DIRECT_URL` | URL direta do Supabase (porta 5432) |
| `NEXTAUTH_SECRET` | String aleatória gerada (mesma do .env) |
| `NEXTAUTH_URL` | `https://ka-bijoux.vercel.app` (será atualizado após deploy) |
| `JWT_SECRET` | Outra string aleatória |
| `NEXT_PUBLIC_APP_URL` | `https://ka-bijoux.vercel.app` |
| `NEXT_TELEMETRY_DISABLED` | `1` |

> **Dica:** Deixe `MERCADO_PAGO_ACCESS_TOKEN` e `MELHOR_ENVIO_TOKEN` em branco por enquanto — serão configurados na próxima fase.

### 3.4 Fazer o deploy

Clique em **"Deploy"**.

Aguarde o build (geralmente 2-4 minutos). Você verá os logs em tempo real.

**O que acontece durante o build:**
1. `npm install` — instala dependências
2. `postinstall` → `prisma generate` — gera o Prisma Client
3. `next build` — compila o Next.js

### 3.5 Verificar o deploy

Após o deploy concluir, a Vercel fornecerá uma URL como:
`https://ka-bijoux-ecommerce.vercel.app`

**Atualize a variável `NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL`** com a URL real:
1. Vá em **Settings** → **Environment Variables**
2. Edite `NEXTAUTH_URL` para a URL real do deploy
3. Edite `NEXT_PUBLIC_APP_URL` para a URL real do deploy
4. Vá em **Deployments** → clique no último deploy → **"Redeploy"**

---

## PASSO 4 — Testar tudo

### 4.1 Testar o painel administrativo

Acesse: `https://SUA_URL.vercel.app/admin/login`

Login: `admin@kabijoux.com.br` / `admin123`

Verifique cada página:

| Rota | O que testar |
|------|-------------|
| `/admin/login` | Login funciona |
| `/admin/dashboard` | Cards de stats carregam |
| `/admin/produtos` | Lista produtos do seed |
| `/admin/produtos/novo` | Formulário abre |
| `/admin/categorias` | 12 categorias aparecem |
| `/admin/pedidos` | Página carrega |
| `/admin/estoque` | Lista produtos |
| `/admin/configuracoes` | Configurações da loja |

### 4.2 Testar as APIs

```bash
# Substituir SUA_URL pela URL do Vercel

# Listar categorias (pública)
curl https://SUA_URL.vercel.app/api/categories

# Listar produtos (pública)
curl https://SUA_URL.vercel.app/api/products

# Login do cliente
curl -X POST https://SUA_URL.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@teste.com","password":"cliente123"}'
```

### 4.3 Testar o app mobile

Edite `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=https://SUA_URL.vercel.app
```

```bash
# Instalar dependências do mobile
cd mobile
npm install

# Iniciar o Expo
npx expo start
```

Escaneie o QR code com o **Expo Go** no celular e verifique:
- Home carrega produtos
- Categorias aparecem
- Login funciona
- Carrinho funciona

---

## PASSO 5 — Domínio personalizado (opcional)

Para usar `kabijoux.com.br` em vez da URL da Vercel:

1. Na Vercel: **Settings** → **Domains** → **Add Domain**
2. Digite: `admin.kabijoux.com.br` (para o painel)
3. Siga as instruções para configurar o DNS no seu registrador de domínio
4. Aguarde a propagação (até 48h, geralmente menos)

---

## Resumo do que foi feito

```
✅ Repositório git inicializado
✅ 78 arquivos commitados (primeiro commit)
✅ schema.prisma configurado para Supabase (directUrl)
✅ package.json com postinstall (prisma generate automático no Vercel)
✅ vercel.json configurado
✅ .env.example completo com todos os serviços
✅ .gitignore protegendo .env e arquivos sensíveis
```

---

## Problemas comuns

**Build falha com erro do Prisma:**
- Verifique se `DATABASE_URL` e `DIRECT_URL` estão corretas nas env vars da Vercel
- A URL do pooler precisa ter `?pgbouncer=true&connection_limit=1` no final

**Erro 500 no admin:**
- Verifique nos logs da Vercel (Functions → Logs)
- Provavelmente `NEXTAUTH_SECRET` ou `JWT_SECRET` está faltando

**Tabelas não foram criadas:**
- Execute `npm run db:push` localmente com o `.env` correto
- O `db:push` conecta diretamente ao Supabase via `DIRECT_URL`

**`npm run db:seed` falhou:**
- Verifique se as tabelas existem primeiro (`db:push`)
- Erros de "Record already exists" são normais — significa que o seed já foi rodado

---

## Próximas etapas (após o deploy estar no ar)

1. **Mercado Pago** — integrar pagamento real (Pix + Cartão)
2. **Melhor Envio** — cálculo de frete real pelos Correios
3. **Upload de imagens** — Cloudinary para fotos dos produtos
4. **App Android/iOS** — build com EAS para publicar nas lojas
5. **Push notifications** — Expo Notifications para notificar clientes
