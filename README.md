# KA Bijoux — E-commerce Completo

Aplicativo de e-commerce próprio da loja **KA Bijoux**, de Itaúna/MG.

## Estrutura do Projeto (Monorepo)

```
ka-bijoux/
├── backend/        Next.js 14 — API + Painel Administrativo
├── mobile/         React Native + Expo — App Android e iPhone
├── shared/         Tipos TypeScript compartilhados
└── package.json    Raiz do monorepo (Yarn Workspaces)
```

---

## Pré-requisitos

- Node.js 18+
- Yarn 1.x
- PostgreSQL 14+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli` (para builds)

---

## Configuração

### 1. Clonar e instalar dependências

```bash
git clone <repo>
cd ka-bijoux
yarn install
```

### 2. Configurar banco de dados

```bash
cd backend
cp .env.example .env
# Edite .env com sua DATABASE_URL e demais chaves
```

### 3. Aplicar migrações e seed

```bash
yarn db:push     # Aplica o schema no banco
yarn db:seed     # Popula com dados iniciais
```

Dados criados pelo seed:
- **Admin**: `admin@kabijoux.com.br` / `admin123`
- **Cliente teste**: `cliente@teste.com` / `cliente123`
- 12 categorias + 8 produtos de exemplo

### 4. Rodar o backend

```bash
yarn backend
# Abre em http://localhost:3000
```

### 5. Rodar o app mobile

```bash
cd mobile
# Crie o arquivo .env com a URL da API:
echo 'EXPO_PUBLIC_API_URL=http://SEU_IP:3000' > .env

yarn start
# Escaneia o QR code no Expo Go
```

---

## Painel Administrativo

Acesse: **http://localhost:3000/admin/login**

Login padrão: `admin@kabijoux.com.br` / `admin123`

### Páginas do painel:
| Rota | Descrição |
|------|-----------|
| `/admin/dashboard` | Visão geral — vendas, pedidos, estoque |
| `/admin/produtos` | Listagem de produtos |
| `/admin/produtos/novo` | Cadastrar produto |
| `/admin/categorias` | Gerenciar categorias |
| `/admin/pedidos` | Todos os pedidos |
| `/admin/pedidos/:id` | Detalhe + atualizar status |
| `/admin/estoque` | Controle de estoque |
| `/admin/configuracoes` | Dados da loja e entregas |

---

## API — Principais Endpoints

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastro de cliente |
| POST | `/api/auth/login` | Login de cliente |
| POST | `/api/auth/admin/login` | Login de admin |

### Produtos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/products` | Listar produtos (filtros, busca, paginação) |
| GET | `/api/products/:id` | Detalhe do produto + relacionados |
| POST | `/api/products` | Criar produto (admin) |
| PATCH | `/api/products/:id` | Editar produto (admin) |

### Carrinho
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/cart` | Ver carrinho |
| POST | `/api/cart` | Adicionar item |
| PATCH | `/api/cart/:itemId` | Atualizar quantidade |
| DELETE | `/api/cart/:itemId` | Remover item |

### Frete
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/shipping/calculate` | Calcular opções de frete |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/orders` | Finalizar compra |
| GET | `/api/orders` | Listar pedidos do cliente |
| GET | `/api/orders/:id` | Detalhe do pedido |
| PATCH | `/api/orders/:id/status` | Atualizar status (admin) |

---

## Entregas

### 1. Retirada na Loja (grátis)
- Sempre disponível quando habilitada nas configurações
- Status: `PRONTO_PARA_RETIRADA`
- Endereço: KA Bijoux, Itaúna/MG

### 2. Mototáxi — Itaúna (R$ 10,00 fixo)
- Disponível apenas para CEPs da região de Itaúna
- Prefixos: 35680–35685
- Valor configurável no painel → Configurações

### 3. Correios (PAC/SEDEX)
- Calculado por CEP, peso e dimensões do produto
- Base preparada para integração com **Melhor Envio**
- Ver: `backend/lib/shipping.ts`

---

## Pagamento

Estrutura preparada para integração com **Mercado Pago**.

### Métodos suportados:
- **Pix** — código gerado no checkout, confirmação via webhook
- **Cartão de Crédito** — tokenização no frontend
- **Boleto** — estrutura pronta, implementação pendente

### Para ativar o Mercado Pago:
```bash
cd backend
npm install mercadopago
```
Preencha `.env`:
```
MERCADOPAGO_ACCESS_TOKEN=seu_token
MERCADOPAGO_WEBHOOK_SECRET=seu_webhook_secret
```
Implemente os métodos em `backend/lib/payment.ts`.

### Webhook:
`POST /api/payment/webhook` — recebe confirmações do gateway

---

## Status dos Pedidos

```
CRIADO → AGUARDANDO_PAGAMENTO → PAGAMENTO_APROVADO
  → EM_SEPARACAO
     → PRONTO_PARA_RETIRADA → ENTREGUE
     → SAIU_PARA_ENTREGA → ENTREGUE
     → ENVIADO_CORREIOS → ENTREGUE
  (a qualquer momento) → CANCELADO
```

---

## Telas do App Mobile

| Tela | Rota |
|------|------|
| Home | `/(tabs)/index` |
| Busca | `/(tabs)/busca` |
| Categorias | `/(tabs)/categorias` |
| Carrinho | `/(tabs)/carrinho` |
| Perfil | `/(tabs)/perfil` |
| Login | `/(auth)/login` |
| Cadastro | `/(auth)/cadastro` |
| Detalhe Produto | `/produto/:id` |
| Checkout — Entrega | `/checkout` |
| Checkout — Pagamento | `/checkout/pagamento` |
| Confirmação | `/checkout/confirmacao` |
| Meus Pedidos | `/pedidos` |

---

## Banco de Dados

Schema Prisma em `backend/prisma/schema.prisma`.

Modelos principais:
- `Customer` — clientes do app
- `Admin` — usuários do painel
- `Product` + `ProductImage` + `ProductVariation`
- `Category`
- `Cart` + `CartItem`
- `Order` + `OrderItem` + `OrderStatusHistory`
- `Payment`
- `Address`
- `Coupon`
- `Notification`
- `StoreSettings`

---

## Build para Produção

### Backend (Vercel ou Railway)
```bash
cd backend
yarn build
yarn start
```

### App Android/iOS (EAS Build)
```bash
cd mobile
eas build --platform android
eas build --platform ios
```

---

## Identidade Visual

| Token | Valor |
|-------|-------|
| Rosa principal | `#FF4D6D` |
| Rosa claro | `#FFB6C1` |
| Rosa suave | `#FFF0F5` |
| Fundo app | `#FFF9FA` |
| Texto principal | `#1A0A0F` |

---

## Contato da Loja

**KA Bijoux** — Itaúna/MG  
Moda, Bijuterias, Acessórios e muito mais!
