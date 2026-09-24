-- A infraestrutura financeira e de webhooks já existe em produção através das
-- migrations históricas da KA Bijoux. Esta migration acrescenta somente o
-- marcador necessário para anonimização de contas.
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
