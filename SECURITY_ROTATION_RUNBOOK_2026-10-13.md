# Runbook de rotação de segurança — KA Bijoux

Este procedimento não deve ser executado sem janela aprovada, backup e acesso
confirmado aos painéis oficiais. Nunca copie segredos para tickets, commits,
capturas de tela ou logs.

## Escopo confirmado

- Uma senha administrativa fixa foi publicada no README, no guia de deploy e
  no seed. Não foi usada nesta auditoria.
- Os cinco achados Bling são cinco ocorrências do mesmo `client_secret`,
  confirmadas por fingerprint criptográfica; portanto existe um segredo Bling
  comprometido a revogar, não cinco segredos distintos.
- A exposição de `DATABASE_URL` é possível em builds antigos, mas não foi
  comprovada. Nenhuma URL real existe no Git e os artefatos locais examinados
  não continham uma connection string PostgreSQL.

## Pré-rotação

- [ ] Identificar o responsável e a janela de mudança.
- [ ] Confirmar backup recuperável do PostgreSQL, sem copiá-lo para o Git.
- [ ] Inventariar Vercel, Supabase, GitHub Actions, máquinas locais e qualquer
      automação que use Bling.
- [ ] Confirmar o e-mail administrativo mascarado e que a conta pertence ao
      proprietário da loja.
- [ ] Registrar apenas IDs de mudança, horário e fingerprint; nunca o valor.

## Administrador

- [ ] Gerar senha exclusiva com pelo menos 16 caracteres em gerenciador de
      senhas; verificar que a senha publicada não foi reutilizada.
- [ ] Rotacionar pelo mecanismo administrativo autorizado. O seed não deve ser
      executado indiscriminadamente em produção apenas para trocar a senha.
- [ ] Invalidar sessões existentes. Como os JWTs atuais são stateless, a opção
      imediata é rotacionar `JWT_SECRET`, sabendo que isso encerra também as
      sessões de clientes; caso não seja aceitável, aguardar o TTL administrativo
      reduzido para 8 horas e programar versionamento de sessão em migração futura.
- [ ] Testar login e logout em janela controlada, sem registrar senha ou token.
- [ ] Confirmar que cinco tentativas por IP em 15 minutos retornam HTTP 429.

## Bling

- [ ] No portal oficial Bling, criar um novo `client_secret` para a aplicação
      correta e revogar o segredo antigo identificado nesta auditoria.
- [ ] Atualizar somente os ambientes que realmente usam a integração.
- [ ] Invalidar tokens de acesso/refresh emitidos para a credencial antiga, se
      o portal oferecer essa opção.
- [ ] Executar uma consulta não destrutiva de catálogo e confirmar que a origem
      e a conta Bling são as esperadas.
- [ ] Monitorar falhas 401/403 e uso da credencial antiga por pelo menos 24 h.

## Banco de dados

- [ ] Revisar deployments construídos desde o commit que adicionou
      `next.config.env` e pesquisar a connection string apenas em ferramenta
      segura, sem imprimir seu valor.
- [ ] Se qualquer artefato público contiver host, usuário ou senha, rotacionar a
      senha do usuário PostgreSQL, atualizar `DATABASE_URL`/`DIRECT_URL` e revogar
      a credencial antiga.
- [ ] Testar conexão, migrations em modo de validação e operações de leitura.

## Histórico Git

- [ ] Rotacionar primeiro; reescrever histórico não revoga credenciais.
- [ ] Aprovar uma janela e congelar pushes.
- [ ] Fazer espelho de backup privado.
- [ ] Usar `git-filter-repo` para remover os valores do README, DEPLOY, seed e
      scripts Bling em todas as branches e tags.
- [ ] Reexecutar Gitleaks em todo o histórico antes do force-push coordenado.
- [ ] Exigir reclone de todos os colaboradores e invalidar forks/caches quando
      possível.

## Rollback

- Código: voltar ao commit anterior da branch por `git revert`, sem reescrever
  histórico e sem restaurar credenciais fixas.
- Bling: manter a credencial nova ativa; corrigir configuração do consumidor em
  vez de reativar o segredo comprometido.
- Banco: restaurar a variável anterior somente se ela não tiver sido exposta; se
  houver suspeita, emitir outra credencial nova.
- Administrador: usar recuperação controlada; nunca recolocar a senha pública.
