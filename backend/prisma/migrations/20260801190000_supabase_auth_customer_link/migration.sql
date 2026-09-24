-- Vínculo mínimo entre o perfil comercial e o usuário do Supabase Auth.
-- A migration é aditiva: não altera IDs, hashes, pedidos ou endereços.

ALTER TABLE "customers"
  ADD COLUMN "authUserId" UUID,
  ADD COLUMN "authMigratedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "customers_authUserId_key" ON "customers"("authUserId");
