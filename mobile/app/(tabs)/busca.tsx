import { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { ProductCard } from "@/components/product/ProductCard";
import { categoriesApi, productsApi } from "@/services/api";
import { getVisibleMobileCategories, type CatalogCategoryForVisibility } from "@/lib/catalogVisibility";

type Product = {
  id: string; name: string; price: number; promotionalPrice?: number | null;
  stock: number; images: Array<{ url: string }>; isNew?: boolean; featured?: boolean;
};

const sections = [
  { value: "all", label: "Todos" },
  { value: "new", label: "Novidades" },
  { value: "promo", label: "Promoções" },
] as const;

const sorts = [
  { value: "createdAt", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "best_sellers", label: "Mais vendidos" },
];

const prices = [
  { label: "Qualquer preço", min: "", max: "" },
  { label: "Até R$ 25", min: "", max: "25" },
  { label: "R$ 25 a R$ 50", min: "25", max: "50" },
  { label: "A partir de R$ 50", min: "50", max: "" },
];

export default function BuscaScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [category, setCategory] = useState("");
  const [section, setSection] = useState<typeof sections[number]["value"]>("all");
  const [sort, setSort] = useState("createdAt");
  const [price, setPrice] = useState(prices[0]);
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const activeSearch = useRef<AbortController | null>(null);

  useEffect(() => {
    let current = true;
    categoriesApi.list().then((res) => {
      if (current) {
        const available: (CatalogCategoryForVisibility & { name: string })[] = res.data.data ?? [];
        setCategories(getVisibleMobileCategories(available));
      }
    }).catch(() => {});
    return () => { current = false; };
  }, []);

  const handleSearch = useCallback(async () => {
    const normalizedQuery = query.trim();
    const filters = {
      sort,
      ...(category ? { category } : {}),
      ...(section === "all" ? {} : { [section]: "true" }),
      ...(normalizedQuery ? { q: normalizedQuery } : {}),
      ...(price.min ? { minPrice: price.min } : {}),
      ...(price.max ? { maxPrice: price.max } : {}),
    };
    activeSearch.current?.abort();
    const controller = new AbortController();
    activeSearch.current = controller;
    setLoading(true);
    setSearched(true);
    setFailed(false);
    try {
      const res = await productsApi.list({ ...filters, page: 1, pageSize: 20 }, controller.signal);
      if (controller.signal.aborted) return;
      setResults(res.data.data?.products ?? []);
      setTotal(res.data.data?.total ?? 0);
      setApplied(filters);
    } catch {
      if (!controller.signal.aborted) {
        setResults([]);
        setFailed(true);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [query, category, section, sort, price]);

  useEffect(() => () => activeSearch.current?.abort(), []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
      </View>

      {/* Campo de busca */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="Buscar bijuterias, perfumes..."
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => {
              activeSearch.current?.abort();
              setQuery("");
              setResults([]);
              setSearched(false);
              setLoading(false);
              setFailed(false);
            }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showFilters }} onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.filterToggle}>Filtros{category || section !== "all" || sort !== "createdAt" || price.min || price.max ? " ativos" : ""}</Text>
        </TouchableOpacity>
        {showFilters && (
          <View style={styles.filterPanel}>
            <Text style={styles.filterLabel}>Categoria</Text>
            <ScrollView horizontal keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
              <FilterChip label="Todas" selected={!category} onPress={() => setCategory("")} />
              {categories.map((option) => (
                <FilterChip key={option.slug} label={option.name} selected={category === option.slug} onPress={() => setCategory(option.slug)} />
              ))}
            </ScrollView>
            <Text style={styles.filterLabel}>Coleção</Text>
            <View style={styles.chips}>
              {sections.map((option) => (
                <FilterChip key={option.value} label={option.label} selected={section === option.value} onPress={() => setSection(option.value)} />
              ))}
            </View>
            <Text style={styles.filterLabel}>Ordenação</Text>
            <ScrollView horizontal keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
              {sorts.map((option) => (
                <FilterChip key={option.value} label={option.label} selected={sort === option.value} onPress={() => setSort(option.value)} />
              ))}
            </ScrollView>
            <Text style={styles.filterLabel}>Faixa de preço</Text>
            <ScrollView horizontal keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
              {prices.map((option) => (
                <FilterChip key={option.label} label={option.label} selected={price === option} onPress={() => setPrice(option)} />
              ))}
            </ScrollView>
            <TouchableOpacity accessibilityRole="button" onPress={() => { setShowFilters(false); void handleSearch(); }}>
              <Text style={styles.filterToggle}>Aplicar filtros</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={loading ? [] : results}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }, results.length === 0 && styles.emptyList]}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
        removeClippedSubviews
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <ProductCard product={item} />
          </View>
        )}
        ListHeaderComponent={
          searched && results.length > 0 ? (
            <Text style={styles.resultCount}>{total} resultados{applied.q ? ` para “${applied.q}”` : ""}</Text>
          ) : null
        }
        ListFooterComponent={!loading && !failed && total > results.length && results.length > 0 ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: "/produtos", params: applied })}>
            <Text style={styles.filterToggle}>Ver todos os resultados</Text>
          </TouchableOpacity>
        ) : null}
        ListEmptyComponent={loading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
        ) : failed ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Não foi possível buscar</Text>
            <Text style={styles.emptyText}>Tente novamente.</Text>
          </View>
        ) : searched ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Nenhum resultado</Text>
            <Text style={styles.emptyText}>Tente buscar por outro termo</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyTitle}>O que você está procurando?</Text>
            <Text style={styles.emptyText}>Digite o nome de um produto para buscar</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.base, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: FontSizes["2xl"], fontWeight: "800", color: Colors.textPrimary },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.base,
    gap: 10,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    height: 46,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: FontSizes.sm },
  filters: { paddingHorizontal: Spacing.base },
  filterToggle: { minHeight: 44, textAlignVertical: "center", paddingVertical: 12, color: Colors.primary, fontWeight: "700" },
  filterPanel: { padding: 12, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, gap: 6 },
  filterLabel: { fontWeight: "700", color: Colors.textPrimary },
  chips: { flexDirection: "row", gap: 6 },
  chip: { minHeight: 44, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.xl },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipLabel: { color: Colors.textPrimary, fontSize: FontSizes.sm },
  chipLabelSelected: { color: "#fff" },
  center: { flex: 1, minHeight: 260, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center", marginTop: 6 },
  row: { gap: 12 },
  list: { padding: Spacing.base, gap: 12 },
  emptyList: { flexGrow: 1 },
  resultCount: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: 8 },
});
