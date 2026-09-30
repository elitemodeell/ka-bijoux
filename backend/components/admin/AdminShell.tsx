"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") {
    return <main className="admin-shell">{children}</main>;
  }
  return (
    <div className="admin-shell min-h-dvh bg-gray-50 lg:flex">
      <Sidebar />
      <main id="admin-content" className="min-w-0 flex-1">
        <div className="admin-content-inner mx-auto max-w-7xl p-4 pb-8 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
