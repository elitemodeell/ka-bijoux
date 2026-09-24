-- Customer commerce data is accessed only through authenticated backend routes.
-- Deny direct PostgREST access for public Supabase roles as an additional barrier.
ALTER TABLE IF EXISTS "addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "carts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "cart_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "addresses", "carts", "cart_items", "orders", "order_items", "payments" FROM anon, authenticated;
