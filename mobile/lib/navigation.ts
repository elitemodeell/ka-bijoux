import type { Href, Router } from "expo-router";

export function goBackOr(router: Pick<Router, "back" | "canGoBack" | "replace">, fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
