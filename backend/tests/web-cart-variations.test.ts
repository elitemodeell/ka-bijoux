import { expect, it, vi } from "vitest";
import { addCartItem, getCartItems, getCartItemKey, removeCartItem, updateCartItem } from "@/lib/client-cart";

it("updates each variation independently and preserves old cart lines", () => {
  const contents = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => contents.get(key),
      setItem: (key: string, value: string) => contents.set(key, value),
    },
    dispatchEvent: vi.fn(),
  });

  const product = { id: "product", name: "Carregador", price: 24 };
  addCartItem(product);
  addCartItem({ ...product, variationId: "white", stock: 2 });
  addCartItem({ ...product, variationId: "black", stock: 5 });
  addCartItem({ ...product, variationId: "white", stock: 2 }, 2);

  const black = getCartItemKey({ id: product.id, variationId: "black" });
  updateCartItem(black, 3);
  expect(getCartItems().map(({ variationId, quantity }) => [variationId, quantity])).toEqual([
    ["black", 3],
    ["white", 2],
    [undefined, 1],
  ]);
  removeCartItem(black);
  expect(getCartItems().map(({ variationId }) => variationId)).toEqual(["white", undefined]);
});
