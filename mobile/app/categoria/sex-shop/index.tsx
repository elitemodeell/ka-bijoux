import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { productsApi } from "@/services/api";
import { ProductCard } from "@/components/product/ProductCard";

const SITE = process.env.EXPO_PUBLIC_API_URL ?? "https://ka-bijoux-backend.vercel.app";
const PAGE_SIZE = 20;

type SortKey = "createdAt" | "price_asc" | "price_desc" | "featured";

const CATEGORY_CARDS = [
  {
    slug: "geis-e-cremes",
    title: "Géis & Cremes",
    subtitle: "Massagem e prazer",
    image: "/uploads/products/k-med-gel-intimo.png",
    bg: "#fde1e5",
  },
  {
    slug: "vibradores",
    title: "Vibradores",
    subtitle: "Controle & intensidade",
    image: "/uploads/products/vibrador-golfinho-rosa.png",
    bg: "#ead9f8",
  },
  {
    slug: "aneis-penianos",
    title: "Anéis Penianos",
    subtitle: "Diversas cores",
    image: "/uploads/products/anel-peniano-bolinha-cores.png",
    bg: "#eadff7",
  },
  {
    slug: "masturbadores",
    title: "Masturbadores",
    subtitle: "EGGs & mini bullets",
    image: "/uploads/products/egg-wavy.png",
    bg: "#eadcf6",
  },
  {
    slug: "lubrificantes",
    title: "Lubrificantes",
    subtitle: "Íntimo & suave",
    image: "/uploads/products/lub-plus-100ml.png",
    bg: "#e6dff5",
  },
  {
    slug: "balas-liquidas",
    title: "Balas Líquidas",
    subtitle: "Sabores especiais",
    image: "/uploads/products/pocao-do-amor.png",
    bg: "#ffdce6",
  },
  {
    slug: "desodorantes-intimos",
    title: "Desodorantes Íntimos",
    subtitle: "Frescor & delicadeza",
    image: "/uploads/products/desodorante-intimo-morango.png",
    bg: "#f4e0f4",
    wide: true,
  },
];

type Product = {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  promotionalPrice?: number | null;
  stock: number;
  images: Array<{ url: string }>;
  isNew?: boolean;
  featured?: boolean;
  variations?: Array<{
    id: string;
    name: string;
    value: string;
    imageUrl?: string | null;
    stock: number;
    isDefault: boolean;
    order: number;
  }>;
};

const SORT_OPTS: { key: SortKey; label: string }[] = [
  { key: "createdAt", label: "Novidades" },
  { key: "price_asc", label: "Menor preço" },
  { key: "price_desc", label: "Maior preço" },
  { key: "featured", label: "Mais vendidos" },
];

const FILTER_OPTS = [
  { key: "all", label: "Todos" },
  { key: "promo", label: "Promoções" },
  { key: "new", label: "Novidades" },
] as const;
type FilterKey = "all" | "promo" | "new";

export default function SexShopScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [total, setTotal] = useState(0);

  async function fetchProducts(nextPage: number, currentSort: SortKey, currentFilter: FilterKey, reset = false) {
    if (loading) return;
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        category: "sex-shop",
        pageSize: PAGE_SIZE,
        page: nextPage,
        sort: currentSort,
        withImage: true,
      };
      if (currentFilter === "promo") params.promo = true;
      if (currentFilter === "new") params.new = true;

      const res = await productsApi.list(params);
      const data = res.data?.data ?? res.data;
      const items: Product[] = data?.products ?? data?.items ?? [];
      const tot: number = data?.total ?? items.length;

      setTotal(tot);
      if (reset) {
        setProducts(items);
      } else {
        setProducts((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === PAGE_SIZE);
      setPage(nextPage);
    } catch {
      // keep existing products on error
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMore(true);
      fetchProducts(1, sort, filter, true);
    }, [sort, filter])
  );

  function handleSortChange(s: SortKey) {
    if (s === sort) return;
    setSort(s);
    setPage(1);
    setHasMore(true);
    setProducts([]);
    fetchProducts(1, s, filter, true);
  }

  function handleFilterChange(f: FilterKey) {
    if (f === filter) return;
    setFilter(f);
    setPage(1);
    setHasMore(true);
    setProducts([]);
    fetchProducts(1, sort, f, true);
  }

  function loadMore() {
    if (!hasMore || loading) return;
    fetchProducts(page + 1, sort, filter);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchProducts(1, sort, filter, true);
    setRefreshing(false);
  }

  const renderProduct = ({ item, index }: { item: Product; index: number }) => (
    <View style={[styles.productCell, index % 2 === 0 ? { marginRight: 6 } : { marginLeft: 6 }]}>
      <ProductCard product={item} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#5d2038" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Linha Adulto</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListFooterComponent={
          loading && products.length > 0 ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : null
        }
        ListHeaderComponent={
          <View>
            {/* Hero */}
            <ImageBackground
              source={{ uri: `${SITE}/banners/ka-intima-hero-premium-mobile.webp` }}
              style={styles.hero}
              imageStyle={styles.heroImage}
            >
              <LinearGradient
                colors={["rgba(248,225,223,0.97)", "rgba(248,225,223,0.80)", "rgba(248,225,223,0.15)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroBadge}>
                <View style={styles.heroBadge18}>
                  <Text style={styles.heroBadge18Text}>18+</Text>
                </View>
                <Text style={styles.heroBadgeLabel}>Acesso restrito</Text>
              </View>
              <Text style={styles.heroTitle}>
                Linha <Text style={{ color: "#df5b8d" }}>Adulto</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                Produtos com discrição, qualidade e entrega sigilosa.
              </Text>
              <View style={styles.heroBenefits}>
                <HeroBenefit icon="cube-outline" title="Discrição" sub="total" />
                <View style={styles.benefitDivider} />
                <HeroBenefit icon="shield-checkmark-outline" title="Compra" sub="segura" />
                <View style={styles.benefitDivider} />
                <HeroBenefit icon="car-outline" title="Entrega" sub="sigilosa" />
              </View>
            </ImageBackground>

            {/* Subcategories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Explorar por categoria</Text>
              <View style={styles.categoryGrid}>
                {CATEGORY_CARDS.map((card) => (
                  <CategoryCard key={card.slug} card={card} />
                ))}
              </View>
            </View>

            {/* Filters strip */}
            <View style={styles.filtersWrap}>
              {/* Filter tabs */}
              <View style={styles.filterTabs}>
                {FILTER_OPTS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.filterTab, filter === opt.key && styles.filterTabActive]}
                    onPress={() => handleFilterChange(opt.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.filterTabText, filter === opt.key && styles.filterTabTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                {SORT_OPTS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.sortChip, sort === opt.key && styles.sortChipActive]}
                    onPress={() => handleSortChange(opt.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.sortChipText, sort === opt.key && styles.sortChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {total > 0 && (
                <Text style={styles.totalText}>
                  <Text style={{ fontWeight: "700" }}>{total}</Text> produto{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
                </Text>
              )}
            </View>

            {loading && products.length === 0 && (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function HeroBenefit({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <View style={styles.benefit}>
      <Ionicons name={icon} size={22} color="#a05a69" />
      <Text style={styles.benefitText}>
        {title}
        {"\n"}
        <Text style={styles.benefitSub}>{sub}</Text>
      </Text>
    </View>
  );
}

function CategoryCard({ card }: { card: typeof CATEGORY_CARDS[number] }) {
  if (card.wide) {
    return (
      <View style={[styles.catCard, styles.catCardWide, { backgroundColor: card.bg }]}>
        <Image source={{ uri: `${SITE}${card.image}` }} style={styles.catImage} resizeMode="contain" />
        <View style={styles.catInfo}>
          <Text style={styles.catTitle}>{card.title}</Text>
          <Text style={styles.catSubtitle}>{card.subtitle}</Text>
        </View>
        <View style={styles.catArrow}>
          <Ionicons name="chevron-forward" size={18} color="#7d4b5d" />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.catCard, { backgroundColor: card.bg }]}>
      <Image source={{ uri: `${SITE}${card.image}` }} style={styles.catImageSmall} resizeMode="contain" />
      <Text style={styles.catTitle} numberOfLines={2}>{card.title}</Text>
      <Text style={styles.catSubtitle} numberOfLines={1}>{card.subtitle}</Text>
      <View style={styles.catArrowSmall}>
        <Ionicons name="chevron-forward" size={14} color="#7d4b5d" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff7f5" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    backgroundColor: "#fff7f5",
    borderBottomWidth: 1,
    borderBottomColor: "#ead3d7",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: "700", color: "#5d2038" },

  hero: {
    minHeight: 280,
    padding: 20,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroImage: { borderRadius: 0 },

  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(213,165,111,0.8)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  heroBadge18: {
    borderWidth: 1,
    borderColor: "#d5a56f",
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  heroBadge18Text: { fontSize: 10, fontWeight: "700", color: "#a76b34" },
  heroBadgeLabel: { fontSize: 11, fontWeight: "700", color: "#a76b34", letterSpacing: 1, textTransform: "uppercase" },

  heroTitle: { fontSize: 40, fontWeight: "900", color: "#5d2038", lineHeight: 42, marginBottom: 10 },
  heroSubtitle: { fontSize: 16, color: "#3d3042", lineHeight: 22, marginBottom: 16, maxWidth: 280 },

  heroBenefits: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.56)",
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: "#e8cfd2",
    overflow: "hidden",
    marginBottom: 4,
  },
  benefit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  benefitDivider: { width: 1, backgroundColor: "#e4cfd0" },
  benefitText: { fontSize: 12, fontWeight: "600", color: "#6e3b4e", lineHeight: 16 },
  benefitSub: { fontWeight: "400" },

  section: { paddingHorizontal: Spacing.base, marginTop: 20, marginBottom: 8 },
  sectionTitle: { fontSize: FontSizes.xl, fontWeight: "800", color: "#5d2038", marginBottom: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  catCard: {
    width: "47.5%",
    minHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dfbdc5",
    padding: 12,
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    ...Shadows.sm,
  },
  catCardWide: { width: "100%", flexDirection: "row", alignItems: "center", gap: 8 },
  catImage: { width: 64, height: 64 },
  catImageSmall: { width: 52, height: 52 },
  catInfo: { flex: 1 },
  catTitle: { fontSize: FontSizes.base, fontWeight: "700", color: "#654067", lineHeight: 20, textAlign: "center" },
  catSubtitle: { fontSize: FontSizes.xs, color: "#6f4f75", marginTop: 2, textAlign: "center" },
  catArrow: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: "#e4c6c7",
    alignItems: "center",
    justifyContent: "center",
  },
  catArrowSmall: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: "#e4c6c7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  filtersWrap: {
    marginHorizontal: Spacing.base,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.64)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ead3d7",
    paddingVertical: 14,
    ...Shadows.sm,
  },
  filterTabs: {
    flexDirection: "row",
    backgroundColor: "#fdf1f2",
    borderRadius: 50,
    marginHorizontal: 14,
    padding: 4,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 50,
  },
  filterTabActive: {
    backgroundColor: "#bd6b8f",
    shadowColor: "#bd6b8f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  filterTabText: { fontSize: FontSizes.sm, fontWeight: "600", color: "#734356" },
  filterTabTextActive: { color: "#fff" },

  sortScroll: { marginBottom: 12 },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#edd8da",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  sortChipActive: {
    backgroundColor: "#df5b8d",
    borderColor: "#df5b8d",
  },
  sortChipText: { fontSize: FontSizes.sm, fontWeight: "600", color: "#6b3d4d" },
  sortChipTextActive: { color: "#fff" },

  totalText: {
    fontSize: FontSizes.sm,
    color: "#7d4b5d",
    paddingHorizontal: 16,
  },

  listContent: { paddingHorizontal: Spacing.base, paddingBottom: 40 },
  productCell: { flex: 1, marginBottom: 12 },
});
