import { requireAdminPageSession } from "@/lib/admin-page-auth";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPageSession();
  return children;
}
