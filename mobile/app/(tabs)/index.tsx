import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  FlatList, Image, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ProductCard } from "@/components/product/ProductCard";
import { productsApi, categoriesApi } from "@/services/api";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";

const BANNERS = [
  { id: "1", text: "🎀 Novidades da Semana", sub: "Bijuterias e Acessórios", bg: Colors.primary },
  { id: "2", text: "💄 Beleza & Presentes",  sub: "A partir de R$ 19,90",  bg: "#E83E5A" },
  { id: "3", text: "🕶️ Verão em Alta",      sub: "Óculos e Acessórios",    bg: Colors.primaryDark },
];

export default function HomeScreen() {
  const router = useRouter();
  const { customer } = useAuthStore();
  const { itemCount, fetchCart } = useCartStore();
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [featured, setFeatured] = useState<unknown[]>([]);
  const [newProducts, setNewProducts] = useState<unknown[]>([]);
  const [bestSellers, setBestSellers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [catRes, featRes, newRes, bestRes] = await Promise.all([
        categoriesApi.list(),
        productsApi.list({ featured: true, pageSize: 6 }),
        productsApi.list({ new: true, pageSize: 6 }),
        productsApi.list({ sort: "best_sellers", pageSize: 6 }),
      ]);
      setCategories(catRes.data.data ?? []);
      setFeatured(featRes.data.data?.products ?? []);
      setNewProducts(newRes.data.data?.products ?? []);
      setBestSellers(bestRes.data.data?.products ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    if (customer) fetchCart();
  }, [customer]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {customer ? `Olá, ${customer.name.split(" ")[0]}! 👋` : "Bem-vinda à"}
            </Text>
            <Text style={styles.storeName}>KA Bijoux ✨</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push("/busca")}
            >
              <Ionicons name="search-outline" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push("/(tabs)/carrinho")}
            >
              <Ionicons name="bag-outline" size={22} color={Colors.textPrimary} />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Banners */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.bannersContainer}
          contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 12 }}
        >
          {BANNERS.map((banner) => (
            <TouchableOpacity
              key={banner.id}
              style={[styles.banner, { backgroundColor: banner.bg }]}
              activeOpacity={0.9}
            >
              <Text style={styles.bannerTitle}>{banner.text}</Text>
              <Text style={styles.bannerSub}>{banner.sub}</Text>
              <View style={styles.bannerBtn}>
                <Text style={styles.bannerBtnText}>Ver produtos →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Categorias */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorias</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/categorias")}>
            <Text style={styles.seeAll}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 10, paddingBottom: 4 }}
        >
          {categories.slice(0, 8).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryChip}
              onPress={() => router.push(`/produtos?category=${cat.slug}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryText}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Em Destaque */}
        {featured.length > 0 && (
          <>
            <ProductSection title="Em Destaque ⭐" products={featured} />
          </>
        )}

        {/* Novidades */}
        {newProducts.length > 0 && (
          <ProductSection title="Novidades 🆕" products={newProducts} />
        )}

        {/* Mais Vendidos */}
        {bestSellers.length > 0 && (
          <ProductSection title="Mais Vendidos 🔥" products={bestSellers} />
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProductSection({ title, products }: { title: string; products: unknown[] }) {
  const router = useRouter();
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.push("/produtos")}>
          <Text style={styles.seeAll}>Ver todos</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={products as Array<{ id: string; name: string; price: number; promotionalPrice?: number | null; stock: number; images: Array<{ url: string }>; isNew?: boolean; featured?: boolean }>}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 12, paddingBottom: 4 }}
        renderItem={({ item }) => (
          <View style={{ width: 160 }}>
            <ProductCard product={item} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    paddingBottom: 16,
  },
  greeting: { fontSize: FontSizes.sm, color: Colors.textMuted },
  storeName: { fontSize: FontSizes.xl, fontWeight: "800", color: Colors.textPrimary },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 42, height: 42,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Shadows.sm,
  },
  cartBadge: {
    position: "absolute", top: -3, right: -3,
    backgroundColor: Colors.primary,
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  bannersContainer: { marginBottom: 8 },
  banner: {
    width: 280, height: 140,
    borderRadius: BorderRadius["2xl"],
    padding: 20,
    justifyContent: "flex-end",
    ...Shadows.md,
  },
  bannerTitle: { color: "#fff", fontSize: FontSizes.lg, fontWeight: "800", marginBottom: 2 },
  bannerSub: { color: "rgba(255,255,255,0.85)", fontSize: FontSizes.sm, marginBottom: 10 },
  bannerBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  bannerBtnText: { color: "#fff", fontSize: FontSizes.xs, fontWeight: "600" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary },
  seeAll: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: "600" },
  categoryChip: {
    backgroundColor: Colors.pinkSoft,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.pinkLight,
  },
  categoryText: { fontSize: FontSizes.sm, color: Colors.primaryDark, fontWeight: "600" },
});
