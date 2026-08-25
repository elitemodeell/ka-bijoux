-- Customer identity and CPF are only read/written by authenticated backend routes.
-- Prisma uses the database owner connection and is not affected by these grants.
ALTER TABLE IF EXISTS "customers" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "customers" FROM anon, authenticated;
