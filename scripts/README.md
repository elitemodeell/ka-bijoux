# KA Bijoux — Scripts de Auditoria e Geração de Imagens

Sistema completo para auditar, classificar e gerenciar a geração de imagens para os ~4.413 produtos do catálogo KA Bijoux.

---

## Instalação (uma vez só)

```bash
cd scripts
npm install
```

---

## Scripts Disponíveis

### 1. `audit-catalog.ts` — Auditoria Completa

Lê todos os produtos do Bling, classifica o status de cada imagem, gera prompts para IA e organiza lotes de geração.

```bash
npx tsx audit-catalog.ts
```

**Saída:**
- `reports/product-image-audit.json` — auditoria completa (todos os 4.413 produtos)
- `reports/product-image-audit.csv` — mesma auditoria em planilha
- `reports/image-generation-queue.json` — fila dos produtos que precisam de imagem nova
- `reports/image-generation-queue.csv` — mesma fila em planilha
- `reports/image-batches/batch-001.json` … `batch-NNN.json` — lotes de 50 produtos cada

**Status de imagem possíveis:**

| Status | Significado |
|--------|-------------|
| `OK_IMAGEM_BOA` | Produto tem imagem própria correta |
| `SEM_IMAGEM` | Nenhuma imagem encontrada |
| `IMAGEM_GENERICA_KA` | Imagem compartilhada (ex: sprite de múltiplas cores) |
| `IMAGEM_RUIM` | Match por nome com score baixo (provavelmente errada) |
| `IMAGEM_ERRADA_VARIACAO` | Produto é rosa mas imagem é vermelha, etc. |
| `PRECISA_REVISAO_MANUAL` | Match com score médio — revisar manualmente |
| `PRECISA_GERAR_IMAGEM` | Normalizado: qualquer status que precisa geração |

---

### 2. `generate-image-prompts.ts` — Gerador/Exportador de Prompts

Exporta os prompts de IA em vários formatos. Aceita filtros por lote, categoria, status e SKU.

```bash
# Exporta tudo (JSON + CSV + TXT + Markdown)
npx tsx generate-image-prompts.ts

# Apenas o lote 1
npx tsx generate-image-prompts.ts --batch 1

# Por categoria
npx tsx generate-image-prompts.ts --category sex-shop
npx tsx generate-image-prompts.ts --category bijuterias

# Por status
npx tsx generate-image-prompts.ts --status SEM_IMAGEM

# SKU específico
npx tsx generate-image-prompts.ts --sku 3104000004755

# Apenas formato TXT (mais fácil para copiar prompts)
npx tsx generate-image-prompts.ts --batch 1 --format txt

# Formatos: all | json | csv | txt | md
```

**Saída em `reports/`:**
- `prompts-lote1.json` / `.csv` / `.txt` / `.md`

---

### 3. `export-image-queue.ts` — Exportador para Ferramentas Externas

Exporta a fila de geração em formatos compatíveis com n8n, Airtable, Excel e outras ferramentas.

```bash
# CSV padrão da fila completa
npx tsx export-image-queue.ts

# Lote específico
npx tsx export-image-queue.ts --batch 1

# Por categoria
npx tsx export-image-queue.ts --category sex-shop --limit 100

# Apenas prompts (arquivo de texto limpo)
npx tsx export-image-queue.ts --batch 2 --only-prompts

# Formatos disponíveis: csv | json | airtable | n8n
npx tsx export-image-queue.ts --format airtable
npx tsx export-image-queue.ts --format n8n --batch 1
```

**Saída em `reports/`:**
- `fila-export-completo.csv` (padrão)
- `fila-airtable-completo.tsv` (para importar no Airtable / Google Sheets)
- `fila-n8n-lote1.json` (para automações n8n/Make)

---

### 4. `import-generated-images.ts` — Importador de Imagens Aprovadas

Copia as imagens da pasta `approved/` para `backend/public/uploads/products/` e atualiza o mapeamento.

```bash
# Simulação (não copia nada, só mostra o que faria)
npx tsx import-generated-images.ts --dry-run

# Importação real
npx tsx import-generated-images.ts

# Força substituição de imagens já existentes
npx tsx import-generated-images.ts --force
```

**Fluxo de pastas:**
```
generated-product-images/
  pending/    ← coloque as imagens geradas aqui
  approved/   ← mova as aprovadas para cá
  rejected/   ← mova as reprovadas para cá
  imported/   ← o script move automaticamente após importar
```

**Saída:**
- `reports/import-report.json` — log detalhado da importação
- Atualiza `backend/data/mapeamento-imagens-produtos.json`

---

### 5. `validate-product-images.ts` — Validação Pós-Importação

Verifica o estado de tudo: o que foi importado, o que ainda está pendente, o que está em cada pasta.

```bash
# Validação completa com progresso
npx tsx validate-product-images.ts

# Apenas produtos faltando
npx tsx validate-product-images.ts --only-missing

# Por categoria
npx tsx validate-product-images.ts --category sex-shop

# Com verificação de integridade dos arquivos
npx tsx validate-product-images.ts --compare-audit
```

**Saída:**
- Relatório no terminal com barra de progresso
- `reports/validation-report.json`

---

## Fluxo de Trabalho Completo

```
1. AUDITAR
   cd scripts && npm install
   npx tsx audit-catalog.ts

2. EXPORTAR PROMPTS (começa pelo lote 1)
   npx tsx generate-image-prompts.ts --batch 1 --format txt
   → Abre reports/prompts-lote1.txt

3. GERAR IMAGENS (manual, via DALL-E / Midjourney / Firefly)
   - Copie cada prompt
   - Salve a imagem com o nome exato indicado em "ARQUIVO:"
   - Coloque em: generated-product-images/pending/

4. REVISAR
   - Abra as imagens em pending/
   - Mova as boas → approved/
   - Mova as ruins → rejected/

5. IMPORTAR
   npx tsx import-generated-images.ts --dry-run   ← confirma antes
   npx tsx import-generated-images.ts              ← importa de fato

6. VALIDAR
   npx tsx validate-product-images.ts

7. REPETIR (lote 2, 3, ...)
   npx tsx generate-image-prompts.ts --batch 2 --format txt
```

---

## Categorias Inferidas

O sistema infere a categoria de cada produto pelo nome (o Bling não preencheu `categoria`):

| Slug | Nome |
|------|------|
| `bijuterias` | Bijuterias |
| `capinhas-acessorios-celular` | Capinhas e Acessórios de Celular |
| `oculos` | Óculos |
| `bolsas-necessaires` | Bolsas e Necessaires |
| `pijamas` | Pijamas |
| `lingerie` | Lingerie |
| `maquiagem` | Maquiagem |
| `perfumaria` | Perfumaria |
| `acessorios-cabelo` | Acessórios de Cabelo |
| `acessorios-inverno` | Acessórios de Inverno |
| `sex-shop` | Linha Adulto |

---

## Arquivos de Dados (não editar manualmente)

| Arquivo | Descrição |
|---------|-----------|
| `backend/data/produtos-bling.json` | Catálogo completo do Bling (4.413 produtos) |
| `backend/data/mapeamento-imagens-produtos.json` | Mapeamento manual produto → imagem |
| `backend/data/bling-image-files.json` | Lista de arquivos disponíveis em uploads/ |
| `reports/product-image-audit.json` | Última auditoria completa |
| `reports/image-generation-queue.json` | Fila de geração (produtos sem imagem boa) |
| `reports/import-report.json` | Log da última importação |
| `reports/validation-report.json` | Último relatório de validação |

---

## Dicas

- **Comece pelo lote 1** — está ordenado por estoque (produtos com mais estoque primeiro)
- **Nomenclatura dos arquivos é crítica** — use exatamente o nome em `desiredFileName`
- **Após importar, rode a auditoria novamente** para atualizar o status
- **O script de importação** só move um arquivo para `imported/` se a cópia para uploads/ tiver sucesso
- **`--dry-run`** sempre antes de importar para conferir o que vai acontecer
