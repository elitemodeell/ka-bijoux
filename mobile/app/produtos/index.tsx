import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ProductCard } from "@/components/product/ProductCard";
import { productsApi } from "@/services/api";

type Product = {
  id: string; slug?: string | null; name: string; price: number; promotionalPrice?: number | null;
  stock: number; images: Array<{ url: string }>; isNew?: boolean; featured?: boolean;
};

const SORT_OPTIONS = [
  { label: "Novidades",    value: "createdAt" },
  { label: "Menor preço", value: "price_asc" },
  { label: "Maior preço", value: "price_desc" },
  { label: "Mais vendidos", value: "best_sellers" },
];

const PAGE_SIZE = 20;

export default function ProdutosScreen() {
  const router = useRouter();
  const { category, subcategory, title, promo, new: newParam, q } = useLocalSearchParams<{
    category?: string;
    subcategory?: string;
    title?: string;
    promo?: string;
    new?: string;
    q?: string;
  }>();
  const isPromo = promo === "true";
  const isNew = newParam === "true";
  const query = typeof q === "string" ? q.trim() : "";

  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort]             = useState("createdAt");
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(true);

  async function fetchProducts(p: number, currentSort: string, replace: boolean) {
    try {
      const params: Record<string, string | number | boolean> = {
        page: p, pageSize: PAGE_SIZE, sort: currentSort,
      };
      if (category) params.category = category;
      if (subcategory) params.subcategory = subcategory;
      if (isPromo) params.promo = true;
      if (isNew) params.new = true;
      if (query) params.q = query;

      const res = await productsApi.list(params);
      const data = res.data.data;
      const items: Product[] = data?.products ?? [];
      const total: number   = data?.total ?? 0;

      setProducts((prev) => replace ? items : [...prev, ...items]);
      setHasMore(p * PAGE_SIZE < total);
      setPage(p);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(1, sort, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcategory, sort, isPromo, isNew, query]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(1, sort, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, category, subcategory, isPromo, isNew, query]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchProducts(page + 1, sort, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, page, sort, category, subcategory, isPromo, isNew, query]);

  const screenTitle = title
    ?? (query
      ? `Busca: ${query}`
      : isPromo
        ? "Promoções"
        : isNew
          ? "Novidades"
          : subcategory
            ? subcategory.replace(/^sex-shop-/, "").replace(/-/g, " ")
            : category
              ? category.replace(/-/g, " ")
              : "Produtos");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{screenTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Ordenação */}
      <FlatList
        data={SORT_OPTIONS}
        keyExtractor={(item) => item.value}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.sortChip, sort === item.value && styles.sortChipActive]}
            onPress={() => setSort(item.value)}
          >
            <Text style={[styles.sortChipText, sort === item.value && styles.sortChipTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
          <Text style={styles.emptyText}>Tente outra categoria ou filtro</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
              : null
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard product={item} />
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
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center",
    ...Shadows.sm,
  },
  title: {
    flex: 1, fontSize: FontSizes.lg, fontWeight: "800",
    color: Colors.textPrimary, textAlign: "center", textTransform: "capitalize",
  },
  sortContainer: { paddingHorizontal: Spacing.base, paddingBottom: 12, gap: 8 },
  sortChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sortChipActive:     { borderColor: Colors.primary, backgroundColor: Colors.pinkSoft },
  sortChipText:       { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: "500" },
  sortChipTextActive: { color: Colors.primary, fontWeight: "700" },
  row:  { gap: 12 },
  list: { padding: Spacing.base, gap: 12 },
  emptyIcon:  { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  emptyText:  { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center", marginTop: 6 },
});
