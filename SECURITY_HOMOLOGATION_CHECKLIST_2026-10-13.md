# Checklist final de homologação — KA Bijoux

## Estado local preparado

- Branch: `codex/security-audit-20261013`.
- Senhas e valores de exemplo publicados foram removidos.
- Login administrativo usa cookie `HttpOnly`, `Secure` em produção,
  `SameSite=Strict`, TTL de 8 horas e não devolve JWT no JSON.
- Rate limit administrativo é persistente, falha fechado em produção e usa o
  IP inserido pela Vercel, validado como IPv4/IPv6.
- Sessões administrativas são revogadas quando `admins.updatedAt` avança, sem
  migração e sem desconectar clientes.
- Runtime fixado em Node 20.19.4 por `engines`, `.nvmrc` e `.node-version`.

## Validações executadas

- Backend: 40 arquivos, 396 testes aprovados em Node 20.19.4.
- Mobile: TypeScript aprovado em Node 20.19.4.
- Bundles JavaScript/Hermes Android e iOS exportados com sucesso.
- Expo Doctor: 16/17 verificações; a pendência é sincronização de campos do
  `app.json` com pastas nativas existentes.
- Web Expo não exporta porque `react-native-web` não está instalado. Isso não
  bloqueia Android/iOS, mas deve ser decidido antes de oferecer versão web.
- Domínio atual e quatro deployments READY anteriores: 304/304 bundles públicos
  verificados, nenhum indicador de connection string PostgreSQL.

## Ações manuais antes de produção

1. Fazer backup e aprovar janela.
2. Publicar este branch em Preview e executar smoke de login, carrinho, pedido e
   sandbox de pagamento; não usar transação real.
3. Rotacionar a senha administrativa pelo fluxo autorizado. Confirmar que uma
   sessão antiga recebe 401 e que uma nova sessão funciona.
4. Criar um novo `client_secret` no portal oficial Bling, atualizar os ambientes
   consumidores e revogar o único segredo antigo. Os cinco achados históricos
   eram repetições do mesmo valor.
5. Decidir a fonte de verdade nativa: manter `android/` e `ios/` e sincronizar
   manualmente os campos do `app.json`, ou aprovar `expo prebuild` em branch
   separada após revisar o diff. Não executar `prebuild --clean` sobre este branch.
6. Somente então promover o mesmo artefato homologado para produção.

## Rollback

- Reverter apenas o commit de segurança com `git revert` e promover o deployment
  anterior; nunca restaurar senha ou segredo Bling comprometido.
- Se a integração Bling falhar, corrigir o ambiente consumidor mantendo o segredo
  antigo revogado.
- A revogação por `updatedAt` não altera schema; rollback não exige banco.

## Classificação

**PRONTO PARA HOMOLOGAÇÃO.** Não está pronto para produção enquanto senha
administrativa e segredo Bling não forem rotacionados e o Preview não passar.
