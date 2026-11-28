import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { favoritesApi } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

export function useProductFavorites() {
  const router = useRouter();
  const customer = useAuthStore((state) => state.customer);
  const [favoriteIds, setFavoriteIds] = useState<Record<string, string>>({});
  const locks = useRef(new Set<string>());

  useFocusEffect(useCallback(() => {
    let active = true;
    setFavoriteIds({});
    if (!customer) return () => { active = false; };
    void favoritesApi.list().then((response) => {
      if (!active) return;
      const rows = response.data?.data ?? [];
      const next: Record<string, string> = {};
      for (const row of rows) {
        if (typeof row?.id === "string" && typeof row?.favoriteId === "string") next[row.id] = row.favoriteId;
      }
      setFavoriteIds(next);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [customer]));

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!customer) {
      router.push("/(auth)/entrada");
      return;
    }
    if (locks.current.has(productId)) return;
    locks.current.add(productId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const existingId = favoriteIds[productId];
    if (existingId) {
      setFavoriteIds((current) => { const next = { ...current }; delete next[productId]; return next; });
      try {
        await favoritesApi.remove(existingId);
      } catch {
        setFavoriteIds((current) => ({ ...current, [productId]: existingId }));
        Alert.alert("Favoritos", "Não foi possível atualizar seus favoritos.");
      }
    } else {
      setFavoriteIds((current) => ({ ...current, [productId]: `pending:${productId}` }));
      try {
        const response = await favoritesApi.create(productId);
        const createdId = response.data?.data?.id;
        if (typeof createdId !== "string") throw new Error("Resposta de favorito inválida");
        setFavoriteIds((current) => ({ ...current, [productId]: createdId }));
      } catch {
        setFavoriteIds((current) => { const next = { ...current }; delete next[productId]; return next; });
        Alert.alert("Favoritos", "Não foi possível salvar este favorito. Tente novamente.");
      }
    }
    locks.current.delete(productId);
  }, [customer, favoriteIds, router]);

  return { favoriteIds, toggleFavorite };
}
