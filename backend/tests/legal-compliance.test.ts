import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEGAL_ADDRESS_INLINE, LEGAL_IDENTITY, LEGAL_ROUTES } from "@/lib/legal-identity";

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");

describe("identidade legal e páginas institucionais", () => {
  it("centraliza os dados oficiais validados", () => {
    expect(LEGAL_IDENTITY).toMatchObject({
      legalName: "KABIJOUX LTDA",
      cnpj: "31.042.012/0001-02",
      legalRepresentative: "Karla Antunes Almeida",
      email: "adm@kabijoux.com.br",
      website: "https://kabijoux.com.br",
    });
    expect(LEGAL_ADDRESS_INLINE).toContain("Rua Capitão Vicente, 110");
    expect(LEGAL_ADDRESS_INLINE).toContain("35680-056");
  });

  it("mantém todas as rotas legais públicas no código", () => {
    for (const route of LEGAL_ROUTES) {
      const page = route === "/app" ? "app/app/page.tsx" : `app/(loja)${route}/page.tsx`;
      expect(() => read(page), route).not.toThrow();
    }
    expect(() => read("app/(loja)/sobre/page.tsx")).not.toThrow();
    expect(() => read("app/sitemap.ts")).not.toThrow();
    expect(() => read("app/robots.ts")).not.toThrow();
    expect(() => read("app/manifest.ts")).not.toThrow();
  });

  it("não publica contatos antigos, placeholders legais ou promessa de frete nacional", () => {
    const files = [
      "app/(loja)/privacidade/page.tsx",
      "app/(loja)/termos/page.tsx",
      "app/(loja)/contato/page.tsx",
      "app/(loja)/entrega/page.tsx",
      "app/(loja)/trocas-e-devolucoes/page.tsx",
      "app/(loja)/cancelamento-e-reembolso/page.tsx",
      "app/(loja)/excluir-conta/page.tsx",
      "components/loja/Footer.tsx",
      "components/loja/QuickShopModal.tsx",
      "lib/home-content.ts",
      "lib/campaign-media.ts",
    ];
    const publicText = files.map(read).join("\n");
    expect(publicText).not.toMatch(/contato@kabijoux\.com\.br/i);
    expect(publicText).not.toMatch(/envio para todo o brasil|entrega para todo o brasil/i);
    expect(publicText).not.toMatch(/dados completos do fornecedor|pendente antes da publicação|não deve ser publicada como definitiva/i);
  });

  it("identifica controlador, venda física e operação real", () => {
    const privacy = read("app/(loja)/privacidade/page.tsx");
    const terms = read("app/(loja)/termos/page.tsx");
    const delivery = read("app/(loja)/entrega/page.tsx");
    expect(privacy).toContain("LEGAL_IDENTITY.legalName");
    expect(terms).toContain("comercializa produtos físicos");
    expect(terms).toContain("Asaas");
    expect(delivery).toContain("Melhor Envio ainda não está homologada");
  });
});
