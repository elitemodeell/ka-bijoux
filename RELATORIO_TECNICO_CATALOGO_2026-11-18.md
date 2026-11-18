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

## Finalização operacional a partir de `80a8d5b`

- O site ganhou checkout autenticado em `/checkout`. Ele importa o carrinho do navegador em uma transação e mantém a maior quantidade de cada opção entre os carrinhos local e da conta. A reimportação mantém a quantidade, e uma linha inválida cancela o lote inteiro. A pessoa pode revisar quantidades, cadastrar endereço e CPF, calcular entrega, inserir cupom e selecionar Pix, boleto ou cartão de acordo com os métodos habilitados. O pedido usa a mesma API, cálculo, gateway e estoque dos aplicativos. A tentativa é guardada por conta na sessão do navegador para reaproveitar a chave de idempotência em falhas de rede.
- A leitura de categorias deixou de gravar no banco. A montagem administrativa do catálogo continua no endpoint de seed autorizado.
- A coleta do Bling usa apenas GET, com paginação, consultas de detalhes e saldos por ID. A conciliação lê o PostgreSQL em transação somente leitura e vincula por ID ou SKU inequívoco com o pai correto. Ela registra divergências de SKU, grupos de nomes e fotos e ausência de evidência. A listagem informa referências de fotos, e a confirmação do conteúdo da foto ainda requer acesso ao armazenamento e revisão quando houver dúvida.
- Comandos locais após a disponibilização dos acessos: `node backend/scripts/snapshot-bling-catalog.cjs` e `node backend/scripts/reconcile-bling-catalog.cjs`. A coleta exige `BLING_ACCESS_TOKEN`. A conciliação exige `CATALOG_DATABASE_READONLY_URL`. As saídas locais estão ignoradas pelo Git.
- A coleta real não executou sem token, e a conciliação real depende do snapshot e da conexão de leitura. Os números da primeira auditoria continuam sendo do export versionado. Os casos de cadastro agrupado, produtos realmente distintos, fotos ambíguas e contagem física por opção estão pendentes.
- A exportação de pedidos e a sincronização bidirecional de estoque do Bling permanecem pendentes. O ERP disponibiliza criação de pedido e lançamento de estoque como operações distintas. Antes de ativar gravações, é necessário comprovar em homologação a regra de lançamento automático da conta, o depósito, o vínculo entre SKU e ID, e a reconciliação após resposta ambígua. Ativar ambos os caminhos sem essa validação pode duplicar a baixa. [Referência oficial da API Bling](https://developer.bling.com.br/referencia)
- Zod 4.6.7 e Vitest 5.1.1 foram validados. O resultado de `npm audit --omit=dev` é zero no backend, e a auditoria incluindo ferramentas reporta zero críticas. Permanecem alertas de ferramentas de build/teste e do ecossistema Expo/React Native que precisam de testes de compatibilidade em atualização separada.
- Passaram 396 testes em 41 suítes, incluindo os testes de coleta e conciliação. O build Next.js e o smoke HTTP com banco local verificaram a rota web, a importação atômica, as quantidades em reenvio, a separação das variações e os limites de estoque. Asaas e Melhor Envio permanecem validados com simulações locais. O fluxo de pagamento completo no navegador ainda precisa de uma sessão Supabase e credenciais sandbox.

### Migração, promoção e rollback

- A migração pendente de estoque/pedidos desta branch é a coluna opcional `order_items.sku`. O checkout web e a coleta somente leitura desta etapa acrescentam zero migrações. A aplicação da coluna foi ensaiada em banco local descartável.
- Antes da janela aprovada, registrar o deploy atual da Vercel e o estado de `prisma migrate status` no alvo. Gerar backup com o script existente e ensaiar restauração em projeto isolado. Aplicar a migração aditiva antes do código novo, conferir contagens de clientes e pedidos e validar compra simulada com retirada e entrega no sandbox.
- Preparar a promoção somente depois do aceite em homologação e da aprovação final. O rollback de código usa o deploy anterior. Manter a coluna nova para preservar os SKUs de pedidos já criados. A rotina de restauração completa do banco exige conciliar transações posteriores ao backup.
- Os acessos Vercel/EAS da máquina estão sem sessão. Faltaram os projetos e papéis necessários para preparar deploy remoto e binários assinados. Os números disponíveis no repositório são iOS `1.0.1 (18)` e Android nativo `1.1.0 (12)`. TestFlight, Google Play interno e versões públicas seguem sem submissão nesta etapa.

### Notas propostas para Apple App Store e Google Play

Melhoramos a escolha de cores, modelos e tamanhos nos produtos com opções. O carrinho identifica cada variação separadamente, e a opção selecionada aparece no pedido. Também ajustamos a transição do carrinho para o pagamento.
