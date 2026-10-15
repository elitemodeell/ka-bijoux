import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("admin protection coverage", () => {
  it("keeps login public and every other admin page under the protected route group", () => {
    const adminRoot = path.join(root, "app", "admin");
    const unprotectedPages: string[] = [];

    function visit(directory: string) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(fullPath);
        if (entry.isFile() && entry.name === "page.tsx") {
          const relative = path.relative(adminRoot, fullPath).replaceAll("\\", "/");
          if (relative !== "login/page.tsx" && !relative.startsWith("(protected)/")) {
            unprotectedPages.push(relative);
          }
        }
      }
    }

    visit(adminRoot);
    expect(unprotectedPages).toEqual([]);
    expect(fs.readFileSync(path.join(adminRoot, "(protected)", "layout.tsx"), "utf8"))
      .toContain("await requireAdminPageSession()");
  });

  it("requires direct authorization before every server page Prisma query", () => {
    const protectedRoot = path.join(root, "app", "admin", "(protected)");
    const failures: string[] = [];

    function visit(directory: string) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(fullPath);
        if (entry.isFile() && entry.name === "page.tsx") {
          const source = fs.readFileSync(fullPath, "utf8");
          if (source.includes("prisma.") && !source.includes("await requireAdminPageSession()")) {
            failures.push(path.relative(protectedRoot, fullPath));
          }
        }
      }
    }

    visit(protectedRoot);
    expect(failures).toEqual([]);
  });

  it("does not leave an administrative endpoint without database-backed authorization", () => {
    const apiRoot = path.join(root, "app", "api", "admin");
    const failures: string[] = [];

    function visit(directory: string) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(fullPath);
        if (entry.isFile() && entry.name === "route.ts") {
          const source = fs.readFileSync(fullPath, "utf8");
          if (!source.includes("requireAdmin")) failures.push(path.relative(apiRoot, fullPath));
        }
      }
    }

    visit(apiRoot);
    expect(failures).toEqual([]);
  });

  it("protects catalog seeding with SUPER_ADMIN instead of a query-string secret", () => {
    const source = fs.readFileSync(path.join(root, "app", "api", "admin", "seed-catalog", "route.ts"), "utf8");
    expect(source).toContain('requireAdminRole(req, ["SUPER_ADMIN"])');
    expect(source).not.toContain("ka-seed-2026");
    expect(source).not.toContain('searchParams.get("secret")');
  });
});
