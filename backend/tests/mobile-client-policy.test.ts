import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isIosAppRequest, isRestrictedIosProduct } from "@/lib/mobile-client";

describe("identidade e política de catálogo do cliente mobile", () => {
  it("só ativa a política iOS com o cabeçalho explícito do aplicativo", () => {
    const ios = new NextRequest("https://kabijoux.com.br/api/products", {
      headers: { "X-KA-Client-Platform": "ios" },
    });
    const web = new NextRequest("https://kabijoux.com.br/api/products");
    expect(isIosAppRequest(ios)).toBe(true);
    expect(isIosAppRequest(web)).toBe(false);
  });

  it("classifica a categoria e subcategoria adulta", () => {
    expect(isRestrictedIosProduct({ name: "Produto", category: { slug: "sex-shop" } })).toBe(true);
    expect(isRestrictedIosProduct({ name: "Produto", subcategory: { slug: "sex-shop-acessorios" } })).toBe(true);
  });

  it("usa a classificação adulta por nome quando o cadastro estiver fora da categoria esperada", () => {
    expect(isRestrictedIosProduct({ name: "Vibrador premium", category: { slug: "outros" } })).toBe(true);
  });

  it("preserva produtos comuns", () => {
    expect(isRestrictedIosProduct({ name: "Brinco dourado", category: { slug: "brincos" } })).toBe(false);
  });
});
