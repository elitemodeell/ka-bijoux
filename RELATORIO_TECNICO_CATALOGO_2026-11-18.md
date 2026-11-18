# KA BIJOUX · Catálogo, variações e homologação

18 de novembro de 2026 · Base `b908a43` · Branch `codex/catalog-variations-homologation`

## Alterações

- A vitrine usa as variações cadastradas no banco para apresentar opções compráveis. O carrinho web registra cada combinação de produto e variação em uma linha independente, com preço, foto, quantidade e estoque da opção. Linhas antigas permanecem legíveis. O checkout web continua indisponível no fluxo atual da loja.
- iOS e Android mantêm o seletor existente, com identificação acessível da opção, reinício de quantidade e imagem na troca e navegação ao checkout após o servidor aceitar o item. O preço adicional é convertido para número na API e no cliente.
- Os carrinhos autenticados e o checkout recusam linhas sem seleção se o produto tem opções ativas. O checkout registra a identidade, o rótulo, o SKU confirmado e, quando disponível, a foto da opção no pedido. A migração adiciona um campo opcional sem reescrever pedidos históricos. A baixa e a devolução de estoque continuam usando o mecanismo existente do Asaas.
- A edição de produto com imagens e variações passou a ser transacional. As variações removidas são desativadas, e a API confere o vínculo com o produto ao editar ou desativar. O painel mostra o SKU gravado na compra para conferência do pedido. O catálogo passou a usar preços atuais do banco em registros que já estão cadastrados nele. A vitrine deixou de exibir avaliações fictícias.
- O importador Bling gera relatório por padrão. A aplicação exige `--apply` com banco local e recusa lotes com IDs ou SKUs duplicados. O vínculo para atualização usa o ID do Bling. Novos produtos entram inativos para revisão, e reimportações preservam nomes, categorias, descrições, imagens, identidade local e revisões. A vitrine deixou de usar nomes como identidade de deduplicação e de vincular SKUs ambíguos ao export.
- Os perfis EAS selecionam ambientes próprios. Desenvolvimento e preview exigem URLs HTTPS distintas dos hosts conhecidos de produção e chave pública Supabase. A configuração Expo e o manifesto Android desabilitam atualizações OTA nesses perfis. Os arquivos Vercel da raiz e do backend bloqueiam deploy automático para esta branch.

## Resultado da leitura do catálogo

`npm.cmd run bling:import --workspace=backend -- --report-only` percorreu **5.652 linhas**, sem usar o banco. Foram encontrados 67 grupos de nomes normalizados repetidos, zero grupos de SKUs repetidos, 646 linhas com imagem encontrada pelo arquivo ou pelo mapeamento e 5.006 sem imagem identificada nessa análise. As associações encontradas incluem 105 grupos com uma referência de imagem compartilhada entre 478 linhas. Nomes comuns e imagens compartilhadas são candidatos à revisão. O export também não permite confirmar descrições comerciais.

O relatório integral está em `tmp/bling-products-report.json` e pode ser regenerado pelo comando acima.

| Caso | Evidência no export |
| --- | --- |
| Carregadores e fontes USB | 15 candidatos por nome, dos quais 4 sem imagem identificada. A fonte de duas entradas (ID Bling `16513308224`, SKU `3104000000607`) aparece a R$ 24,00 e com saldo agregado de 14 no arquivo. O modelo LE-285, os SKUs-filho, as fotos por cor e os saldos individuais precisam de confirmação. |
| Capinhas | 319 candidatos por nome e padrão de modelo, dos quais 303 sem imagem identificada. |
| Cabos | 40 candidatos por nome, dos quais 14 sem imagem identificada. |
| Creme facial Q10 | Nenhum candidato por Q10 ou coenzima. É necessário o SKU ou cadastro atualizado. |
| Produtos para os pés | A busca por “para os pés” e “podal” encontrou o esfoliante `3104000004250`. |
| Balança digital | 4 candidatos por nome, dos quais 3 sem imagem identificada. Entre eles há uma balança explicitamente analógica. O modelo digital exige confirmação. |

Nenhum dado de catálogo comercial foi inventado, conciliado automaticamente ou alterado em produção.

## Validação e publicação

- Passaram 393 testes Vitest em 40 suítes, incluindo carrinho por variante, linha histórica sem seleção e identidade comercial da opção no pedido. As suítes de Asaas, webhooks, checkout e frete usam dependências simuladas.
- Um banco temporário PGlite em loopback permitiu validar o build Next.js, renderizar a página com duas opções e exercer a API móvel via HTTP. A API devolveu o acréscimo numérico, recusou a ausência de seleção, manteve duas linhas e impediu acréscimo acima do estoque. Uma aplicação separada da migração preservou a linha histórica de teste e deixou seu SKU nulo.
- TypeScript, lint (46 avisos e zero erros) e cinco suítes móveis executadas. Os bundles Expo para iOS e Android foram exportados localmente com a API em loopback. O repositório declara iOS `1.0.1 (18)` e Android nativo `1.1.0 (12)`. Antes de reservar novos números, conferir a última versão nos consoles. Perfis ainda compartilham o identificador do app, e o APK de preview deve ser validado em dispositivo de homologação dedicado.
- A CLI local do EAS e a da Vercel estão sem sessão. Os testes locais não substituem a operação em sandbox de Asaas e Melhor Envio, a conferência de Storage e Auth no Supabase de homologação, a execução do Bling com credenciais restritas ou a revisão em dispositivo dos binários assinados. Nenhuma cobrança, deploy ou submissão foi feita.
- A atualização de dependências manteve as faixas declaradas no projeto. Next.js passou a 16.4.6, Sharp a 0.35.5 e Expo a 54.0.38. A auditoria de dependências de produção caiu de 7 para 1 no backend e de 59 para 44 no mobile, com zero críticas reportadas nos dois. A atualização do Zod e os alertas remanescentes da cadeia Expo e React Native exigem compatibilidade e validação nativa antes de uso em produção.
- O importador ainda depende de um export que identifique pai e filho, com SKU, saldo e imagem confiável para cada opção. A integração de pedidos e estoque com o Bling permanece pendente de validar o contrato real do ERP. Até então, a compra registra a variação no banco da loja e permanece disponível para conciliação.
- Separar cadastros agrupados e corrigir nomes, imagens e categorias reais exige um inventário atualizado do ERP, fotos confirmadas e a revisão dos casos pela loja. Para aplicar dados, gerar e verificar backup do alvo primeiro. A migração aditiva deve ser testada no ambiente de homologação antes da janela aprovada de produção.
