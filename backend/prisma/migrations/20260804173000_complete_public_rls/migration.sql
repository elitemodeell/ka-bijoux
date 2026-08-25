-- These operational tables are private implementation details of the backend.
-- The application does not access them through PostgREST; Prisma connects with
-- the database owner/service connection and therefore continues to function.
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "account_deletion_audits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "account_deletion_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payment_webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "rate_limit_buckets" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  "_prisma_migrations",
  "account_deletion_audits",
  "account_deletion_requests",
  "payment_webhook_events",
  "rate_limit_buckets"
FROM anon, authenticated;
