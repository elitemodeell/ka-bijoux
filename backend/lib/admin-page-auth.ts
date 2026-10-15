import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateAdminSessionToken } from "./auth";

export async function requireAdminPageSession() {
  const token = (await cookies()).get("ka-admin-token")?.value;
  const admin = token ? await validateAdminSessionToken(token) : null;
  if (!admin) redirect("/admin/login");
  return admin;
}
