-- The storefront and mobile app use validated backend routes. Direct
-- PostgREST access to Prisma tables is denied by default.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'admins','categories','consent_logs','coupons','email_otp_rate_limits',
    'favorites','notifications','order_status_history',
    'pending_email_registrations','product_images','product_variations',
    'products','reviews','store_settings','story_groups','story_items'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated', table_name);
  END LOOP;
END $$;
