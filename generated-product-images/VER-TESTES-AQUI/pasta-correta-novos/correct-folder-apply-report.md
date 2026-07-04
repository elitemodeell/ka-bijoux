# Pasta correta - novas imagens aplicadas localmente

Status: aplicado somente na plataforma local. Não houve deploy e não houve atualização online no Bling.

## Resumo

- Novas imagens detectadas na pasta correta: 22
- Produtos atualizados localmente: 4
- Imagens pendentes por dúvida/SKU ausente: 18
- Deploy: não realizado
- Bling online: não atualizado

## Aplicadas

| Imagem | Produto | SKU | Preco | Arquivo |
| --- | --- | --- | --- | --- |
| NEW-IMG001 | Roleta Kamasutra Sexy | 3104000001682 | R$ 24 | roleta-sexy-3104000001682.jpg |
| NEW-IMG004 | Jogo Duelo do Prazer Sexy | 3104000004391 | R$ 12 | jogo-duelo-do-prazer-sexy-3104000004391.jpg |
| NEW-IMG009 | Plug Metálico com Cristal Transparente | 3104000000804 | R$ 24 | plug-metal-sexy-3104000000804.jpg |
| NEW-IMG018 | Plug Metálico Premium com Cristal Coração Transparente | 3104000001499 | R$ 48 | plug-metal-premium-sexy-3104000001499.jpg |

## Pendentes

| Imagem | Arquivo | Motivo |
| --- | --- | --- |
| NEW-IMG002 | ChatGPT Image 30 de jun. de 2026, 20_45_50.png | Arte extra do mesmo Jogo Duelo do Prazer; o SKU único já recebeu a imagem principal NEW-IMG004. |
| NEW-IMG003 | ChatGPT Image 30 de jun. de 2026, 20_46_07.png | Mostra Duelo de Casal, mas não existe SKU local com esse nome exato. |
| NEW-IMG005 | ChatGPT Image 1 de jul. de 2026, 13_31_11 (1).png | Variação de plug com cristal furta-cor sem SKU individual de cor/formato. |
| NEW-IMG006 | ChatGPT Image 1 de jul. de 2026, 13_31_13 (3).png | Variação de plug com cristal furta-cor sem SKU individual de cor/formato. |
| NEW-IMG007 | ChatGPT Image 1 de jul. de 2026, 13_31_12 (2).png | Variação de plug com cristal azul sem SKU individual de cor/formato. |
| NEW-IMG008 | ChatGPT Image 1 de jul. de 2026, 13_31_44 (2).png | Variação de plug com cristal violeta sem SKU individual de cor/formato. |
| NEW-IMG010 | ChatGPT Image 1 de jul. de 2026, 13_31_47 (4).png | Variação de plug com cristal lilás sem SKU individual de cor/formato. |
| NEW-IMG011 | ChatGPT Image 1 de jul. de 2026, 13_31_47 (3).png | Variação de plug com cristal rosa sem SKU individual de cor/formato. |
| NEW-IMG012 | ChatGPT Image 1 de jul. de 2026, 13_31_48 (5).png | Variação de plug com cristal coração rosa sem SKU individual de cor/formato. |
| NEW-IMG013 | ChatGPT Image 1 de jul. de 2026, 13_32_08 (1).png | Variação de plug com cristal coração roxo sem SKU individual de cor/formato. |
| NEW-IMG014 | ChatGPT Image 1 de jul. de 2026, 13_32_08 (2).png | Variação de plug com cristal coração roxo sem SKU individual de cor/formato. |
| NEW-IMG015 | ChatGPT Image 1 de jul. de 2026, 13_32_08 (3).png | Variação de plug com cristal coração azul sem SKU individual de cor/formato. |
| NEW-IMG016 | ChatGPT Image 1 de jul. de 2026, 13_32_09 (4).png | Variação de plug com cristal vermelho sem SKU individual de cor/formato. |
| NEW-IMG017 | ChatGPT Image 1 de jul. de 2026, 13_32_09 (5).png | Variação de plug com cristal coração azul sem SKU individual de cor/formato. |
| NEW-IMG019 | ChatGPT Image 1 de jul. de 2026, 13_36_56 (2).png | Variação de plug com cristal coração rosa sem SKU individual de cor/formato. |
| NEW-IMG020 | ChatGPT Image 1 de jul. de 2026, 13_36_57 (3).png | Variação de plug com cristal rosa sem SKU individual de cor/formato. |
| NEW-IMG021 | ChatGPT Image 1 de jul. de 2026, 13_36_58 (4).png | Variação de plug com cristal rosé lilás sem SKU individual de cor/formato. |
| NEW-IMG022 | ChatGPT Image 1 de jul. de 2026, 13_36_58 (5).png | Variação de plug com cristal lilás sem SKU individual de cor/formato. |

## Links locais para conferir

- http://localhost:3000/produto/roleta-sexy
- http://localhost:3000/produto/jogo-duelo-do-prazer-sexy
- http://localhost:3000/produto/plug-metal-sexy
- http://localhost:3000/produto/plug-metal-premium-sexy

## Validação local

- TypeScript: `npx tsc --noEmit` OK.
- Páginas de produto: 4/4 OK com nome, imagem, descrição, modo de uso e cuidados.
- Busca/card da Linha Adulto: OK via `/categoria/sex-shop?q=...` e API `/api/products?line=adult`.
- Subcategorias locais: OK em `/categoria/sex-shop/acessorios-adultos` e `/categoria/sex-shop/jogos-adultos`.
- Deploy: não realizado.
- Bling online: não atualizado.
