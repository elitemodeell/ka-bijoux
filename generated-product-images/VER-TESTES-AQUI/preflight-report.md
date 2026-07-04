# KA Bijoux - preflight de imagens prontas

## Resumo

- Pasta origem: `C:\Users\bruno\Downloads\produtos atualizados\ChatGPT Image 30 de jun. de 2026, 20_44_00 (3).png`
- Imagens prontas encontradas: **69**
- Produtos no catálogo Bling local: **4413**
- Itens na fila de imagens: **4355**
- Produtos na auditoria de imagem: **4413**
- Arquivos atuais em `backend/public/uploads/products`: **114**
- Entradas atuais em `backend/data/mapeamento-imagens-produtos.json`: **42**
- Entradas atuais em `backend/data/bling-image-files.json`: **114**

## Status de segurança

Nenhuma imagem foi anexada ao Bling.
Nenhuma imagem foi aplicada no banco/plataforma.
Nenhuma descrição foi alterada.
Nenhum deploy foi feito.

## Observação crítica

As 69 imagens têm nomes genéricos do ChatGPT e não possuem metadados com nome do produto. Como não há OCR/modelo visual local disponível, não é seguro associar automaticamente cada imagem a um produto apenas pelo arquivo.

Por isso foram criados dois arquivos:

- `manual-match-template.csv`: planilha segura para preencher/confirmar SKU, ID Bling e produto de cada `IMG###`.
- `order-based-candidates.csv`: hipótese por ordem cronológica versus fila de geração. Todos os itens estão marcados como `DUVIDA_ORDEM_NAO_CONFIRMADA`.

## Teste com 5 produtos

O arquivo `test-5-candidates.csv` contém os 5 primeiros candidatos **somente para revisão**. Eles só devem ser aplicados se houver confirmação visual ou se for confirmado que as imagens foram geradas exatamente na mesma ordem da fila.

## Artefatos de revisão

- `review.html`: revisão visual com miniaturas e candidato por ordem.
- `contact-sheet-01.jpg` a `contact-sheet-05.jpg`: folhas numeradas para conferência.
- `downloads-image-inventory.json`: inventário técnico das imagens de origem.
- `manual-match-template.csv`: planilha de correspondência manual segura.
- `order-based-candidates.csv`: candidatos por ordem, não aprovados.
- `test-5-candidates.csv`: primeiro bloco de teste, não aplicado.

## Como a plataforma usa a imagem

Para produtos do catálogo Bling local, a imagem principal aparece nas listagens e detalhes quando:

1. O arquivo existe em `backend/public/uploads/products`.
2. O produto está mapeado por `blingId` ou `sku` em `backend/data/mapeamento-imagens-produtos.json`.
3. O nome do arquivo também está refletido em `backend/data/bling-image-files.json` ou resolvido pelo mapeamento.

Depois da confirmação dos 5 produtos, o próximo passo seguro é copiar/renomear esses 5 arquivos para `uploads/products`, atualizar o mapeamento local e rodar validação. Para Bling online, ainda falta credencial OAuth/API configurada.
