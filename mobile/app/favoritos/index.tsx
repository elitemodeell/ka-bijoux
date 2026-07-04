import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ProductCard } from "@/components/product/ProductCard";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/services/api";
import { Button } from "@/components/ui/Button";

type FavoriteItem = {
  favoriteId: string;
  id: string; name: string; price: number; promotionalPrice?: number | null;
  stock: number; images: Array<{ url: string }>; isNew?: boolean; featured?: boolean;
};

export default function FavoritosScreen() {
  const router = useRouter();
  const { customer } = useAuthStore();
  const [favorites, setFavorites]   = useState<FavoriteItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchFavorites() {
    try {
      const res = await api.get("/api/customers/me/favorites");
      setFavorites(res.data.data ?? []);
    } catch {
      setFavorites([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (customer) fetchFavorites();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFavorites();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeFavorite(favoriteId: string) {
    setFavorites((prev) => prev.filter((f) => f.favoriteId !== favoriteId));
    try {
      await api.delete(`/api/customers/me/favorites/${favoriteId}`);
    } catch {
      fetchFavorites();
    }
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Favoritos</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🤍</Text>
          <Text style={styles.emptyTitle}>Faça login para ver seus favoritos</Text>
          <View style={{ marginTop: 20, width: 220 }}>
            <Button label="Entrar na conta" onPress={() => router.push("/(auth)/login")} fullWidth />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Favoritos</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🤍</Text>
          <Text style={styles.emptyTitle}>Nenhum favorito ainda</Text>
          <Text style={styles.emptyText}>Toque no coração de um produto para salvá-lo aqui</Text>
          <View style={{ marginTop: 20, width: 220 }}>
            <Button label="Ver Produtos" onPress={() => router.push("/produtos")} fullWidth />
          </View>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.favoriteId}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1, position: "relative" }}>
              <ProductCard product={item} />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeFavorite(item.favoriteId)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="heart" size={15} color={Colors.error} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", ...Shadows.sm,
  },
  title:     { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  row:       { gap: 12 },
  list:      { padding: Spacing.base, gap: 12 },
  removeBtn: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    ...Shadows.sm,
  },
  emptyIcon:  { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  emptyText:  { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center", marginTop: 6 },
});
