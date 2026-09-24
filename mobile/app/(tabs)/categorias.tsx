import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { categoriesApi } from "@/services/api";
import { getMobileProductCount, getVisibleMobileCategories } from "@/lib/catalogVisibility";
import { categoryArtwork } from "@/components/home/brand";

function artworkFor(slug: string) {
  if (slug.includes("capinha") || slug.includes("celular")) return categoryArtwork.phone;
  if (slug.includes("bijuter") || slug.includes("relog") || slug.includes("oculos")) return categoryArtwork.diamond;
  if (slug.includes("presente") || slug.includes("promoc")) return categoryArtwork.tag;
  if (slug.includes("novidade") || slug.includes("perfume")) return categoryArtwork.new;
  if (slug.includes("cabelo") || slug.includes("bolsa")) return categoryArtwork.heart;
  return categoryArtwork.sparkles;
}

const HOME_CACHE_KEY = "ka-mobile-home-v2";

interface Category {
  id: string; name: string; slug: string; active: boolean;
  description?: string | null;
  _count?: { products: number };
  mobileProductCount?: number | null;
}

export default function CategoriasScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cached = await AsyncStorage.getItem(HOME_CACHE_KEY);
        const parsed = cached ? JSON.parse(cached) : null;
        if (Array.isArray(parsed?.categories)) {
          if (!cancelled) {
            setCategories(getVisibleMobileCategories(parsed.categories));
            setLoading(false);
          }
          return;
        }
      } catch {
        // Cache inválido não deve bloquear o catálogo.
      }
      try {
        const response = await categoriesApi.list();
        if (!cancelled) setCategories(getVisibleMobileCategories(response.data.data ?? []));
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Categorias</Text>
        <Text style={styles.subtitle}>Explore todos os produtos</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
        initialNumToRender={8}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/produtos?category=${item.slug}`)}
            activeOpacity={0.8}
          >
            <View style={styles.artworkContainer}>
              <Image source={artworkFor(item.slug)} style={styles.artwork} contentFit="contain" />
            </View>
            <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
            {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}
            {getMobileProductCount(item) > 0 && (
              <Text style={styles.productCount}>
                {getMobileProductCount(item)} {getMobileProductCount(item) === 1 ? "produto" : "produtos"}
              </Text>
            )}
            <View style={styles.arrow}><Ionicons name="arrow-forward" size={14} color="#fff" /></View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: { fontSize: FontSizes["2xl"], fontWeight: "800", color: Colors.textPrimary },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  row: { gap: 8 },
  list: { paddingHorizontal: 10, paddingTop: 8, gap: 8 },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#fce7f3",
    paddingHorizontal: 5,
    paddingTop: 10,
    paddingBottom: 38,
    minHeight: 164,
    alignItems: "center",
    gap: 6,
    ...Shadows.sm,
  },
  artworkContainer: {
    width: 58, height: 58,
    backgroundColor: Colors.pinkSoft,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "#ffc5d4",
    alignItems: "center", justifyContent: "center",
  },
  artwork: { width: 48, height: 48 },
  categoryName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  description: { fontSize: 9, lineHeight: 12, color: Colors.textMuted, textAlign: "center" },
  productCount: { fontSize: 9, color: Colors.textMuted },
  arrow: { position: "absolute", right: 8, bottom: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
});
