import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ProductCard } from "@/components/product/ProductCard";
import { useAuthStore } from "@/stores/authStore";
import { favoritesApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { LuxuryBackground } from "@/components/ios/LuxuryBackground";

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
      const res = await favoritesApi.list();
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
      await favoritesApi.remove(favoriteId);
    } catch {
      fetchFavorites();
    }
  }

  if (Platform.OS === "ios" && !loading && (!customer || favorites.length === 0)) {
    const isGuest = !customer;
    return (
      <SafeAreaView style={iosStyles.safe} edges={["top"]}>
        <LuxuryBackground />
        <ScrollView contentContainerStyle={iosStyles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={iosStyles.backButton}>
            <Ionicons name="chevron-back" size={31} color="#c80049" />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={iosStyles.title}>Favoritos</Text>
          <Text style={iosStyles.subtitle}>Seus produtos favoritos ficam{`\n`}aqui para você acessar sempre{`\n`}que quiser.</Text>
          <View style={iosStyles.heroWrap}>
            <Image source={require("../../assets/redesign-ios/favorites-hero.png")} style={iosStyles.hero} contentFit="contain" />
            <View style={iosStyles.officialLogoBadge}>
              <Image source={require("../../assets/icon.png")} style={iosStyles.officialLogo} contentFit="contain" accessibilityLabel="Logo oficial KA Bijoux" />
            </View>
          </View>
          <Text style={iosStyles.emptyTitle}>{isGuest ? "Entre para salvar seus favoritos" : "Nenhum favorito ainda"}</Text>
          <Text style={iosStyles.emptyText}>{isGuest ? "Acesse sua conta para ver e organizar os produtos que você ama." : "Toque no coração de um produto para salvá-lo aqui e encontrar mais rápido depois."}</Text>
          <View style={iosStyles.features}>
            {[["heart-outline", "Salve seus\nprodutos favoritos"], ["bag-handle-outline", "Acesse quando\nquiser"], ["notifications-outline", "Receba novidades\ne promoções"]].map(([icon, label], index) => (
              <View key={label} style={[iosStyles.feature, index > 0 && iosStyles.featureBorder]}>
                <View style={iosStyles.featureIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={28} color="#be0044" /></View>
                <Text style={iosStyles.featureText}>{label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push(isGuest ? "/(auth)/entrada" : "/produtos")} activeOpacity={0.86}>
            <LinearGradient colors={["#ff6480", "#ed1760", "#bd0049"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={iosStyles.primaryButton}>
              <Ionicons name={isGuest ? "person-outline" : "bag-handle-outline"} size={22} color="#fff" />
              <Text style={iosStyles.primaryButtonText}>{isGuest ? "Entrar na conta" : "Ver Produtos"}</Text>
              <Ionicons name="chevron-forward" size={23} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
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
            <Button label="Entrar na conta" onPress={() => router.push("/(auth)/entrada")} fullWidth />
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

const iosStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff7f8" },
  content: { paddingHorizontal: 22, paddingBottom: 44 },
  backButton: { marginTop: 6, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", shadowColor: "#cc6c8a", shadowOpacity: 0.13, shadowRadius: 11, shadowOffset: { width: 0, height: 5 } },
  title: { color: "#a6003c", fontFamily: "PlayfairDisplay", fontSize: 38, textAlign: "center", marginTop: -42 },
  subtitle: { color: "#73767e", fontFamily: "Inter", fontSize: 16, lineHeight: 23, textAlign: "center", marginTop: 8 },
  heroWrap: { height: 390, marginTop: -2, alignItems: "center", justifyContent: "center" },
  hero: { width: "100%", height: "100%" },
  officialLogoBadge: { position: "absolute", top: 176, width: 76, height: 60, borderRadius: 16, backgroundColor: "#fff", overflow: "hidden", opacity: 0.92, shadowColor: "#a94b69", shadowOpacity: 0.1, shadowRadius: 5 },
  officialLogo: { width: "100%", height: "100%" },
  emptyTitle: { color: "#a6003c", fontFamily: "PlayfairDisplay", fontSize: 31, lineHeight: 36, textAlign: "center", marginTop: -12 },
  emptyText: { color: "#74777e", fontFamily: "Inter", fontSize: 15, lineHeight: 22, textAlign: "center", paddingHorizontal: 25, marginTop: 10 },
  features: { flexDirection: "row", marginTop: 26 },
  feature: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  featureBorder: { borderLeftWidth: 1, borderLeftColor: "rgba(211,129,154,0.2)" },
  featureIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,220,230,0.75)", alignItems: "center", justifyContent: "center" },
  featureText: { color: "#777880", fontFamily: "Inter", fontSize: 11, lineHeight: 15, textAlign: "center", marginTop: 7 },
  primaryButton: { height: 60, borderRadius: 30, marginHorizontal: 38, marginTop: 26, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 23, shadowColor: "#d51a5b", shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
  primaryButtonText: { color: "#fff", fontFamily: "PlayfairDisplay", fontSize: 20 },
});
