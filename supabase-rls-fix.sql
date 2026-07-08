-- ─────────────────────────────────────────────────────────────────────────────
-- KA Bijoux — Habilitar RLS em todas as tabelas
--
-- COMO USAR:
--   1. Abra o Supabase Dashboard → projeto ka-bijoux
--   2. Acesse: SQL Editor → New query
--   3. Cole este arquivo inteiro e clique em Run
--
-- Por que é seguro:
--   - Todo acesso ao banco já passa pelo Prisma com a service role
--   - A service role NUNCA é afetada pelo RLS (ignora todas as políticas)
--   - Habilitar RLS sem policies bloqueia acesso via anon key (Supabase JS direto)
--   - Nenhuma linha de código do app precisa ser alterada
-- ─────────────────────────────────────────────────────────────────────────────

-- Tabelas públicas do catálogo (produtos, categorias, stories)
ALTER TABLE "categories"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_groups"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_items"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_settings"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coupons"           ENABLE ROW LEVEL SECURITY;

-- Tabelas sensíveis (dados de clientes, pedidos, pagamentos)
ALTER TABLE "admins"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customers"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "addresses"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "carts"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cart_items"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_status_history"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "favorites"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications"         ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verificação: rodar após o bloco acima para confirmar que o RLS está ativo
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
