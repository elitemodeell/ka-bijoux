ALTER TABLE "apple_auth_credentials" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "apple_auth_credentials" FROM anon;
REVOKE ALL ON TABLE "apple_auth_credentials" FROM authenticated;
