import { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, ScrollView, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { Colors, FontSizes, Spacing, BorderRadius } from "@/constants/theme";
import { ProductCard } from "@/components/product/ProductCard";
import { categoriesApi, productsApi } from "@/services/api";
import { getVisibleMobileCategories, type CatalogCategoryForVisibility } from "@/lib/catalogVisibility";
import { useAuthStore } from "@/stores/authStore";

type Product = {
  id: string; name: string; price: number; promotionalPrice?: number | null;
  stock: number; images: { url: string }[]; image?: string | null; slug?: string;
  category?: { name?: string; slug?: string } | null; isNew?: boolean; featured?: boolean;
};

const SEARCH_HISTORY_KEY = "ka-search-history-v1";
const SUGGESTION_CACHE_TTL = 30_000;
const suggestionCache = new Map<string, { expiresAt: number; products: Product[] }>();
const RELATED_SEARCH_TERMS = [
  { triggers: ["pul", "pulseira", "bracelete"], labels: ["Pulseiras", "Braceletes"] },
  { triggers: ["cap", "capinha", "capa celular"], labels: ["Capinhas", "Capas para celular"] },
  { triggers: ["perf", "perfume", "fragrancia"], labels: ["Perfumes", "Fragrâncias"] },
  { triggers: ["carreg", "fonte", "cabo"], labels: ["Carregadores", "Fontes", "Cabos"] },
  { triggers: ["fone", "headphone", "headset", "bluetooth"], labels: ["Fones sem fio", "Headphones", "Bluetooth"] },
];

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function searchHistoryKey(customerId?: string) {
  return `${SEARCH_HISTORY_KEY}:${customerId ?? "guest"}`;
}

async function readSearchHistory(customerId?: string) {
  try {
    const value = await AsyncStorage.getItem(searchHistoryKey(customerId));
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
  } catch { return []; }
}

async function rememberSearch(query: string, customerId?: string) {
  const clean = query.trim().slice(0, 100);
  if (clean.length < 2) return;
  const recent = await readSearchHistory(customerId);
  const next = [clean, ...recent.filter((item) => normalizeSearch(item) !== normalizeSearch(clean))].slice(0, 8);
  await AsyncStorage.setItem(searchHistoryKey(customerId), JSON.stringify(next)).catch(() => undefined);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

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
  const { width: viewportWidth } = useWindowDimensions();
  const productCellWidth = Math.max(0, (viewportWidth - 16 - 8) / 2);
  const router = useRouter();
  const customer = useAuthStore((state) => state.customer);
  const params = useLocalSearchParams<{ q?: string }>();
  const tabBarHeight = useBottomTabBarHeight();
  const [query, setQuery] = useState("");
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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
  const activeSuggestionSearch = useRef<AbortController | null>(null);
  const initialQueryHandled = useRef<string | null>(null);
  const matchingCategories = categories.filter((item) => {
    const key = normalizeSearch(query);
    return key.length >= 2 && (normalizeSearch(item.name).includes(key) || normalizeSearch(item.slug).includes(key));
  }).slice(0, 4);
  const suggestedCorrection = normalizeSearch(query) === "carregdor" ? "carregador" : null;
  const relatedTerms = RELATED_SEARCH_TERMS.find((group) => group.triggers.some((term) => {
    const normalizedTerm = normalizeSearch(term);
    const key = normalizeSearch(query);
    return key.length >= 2 && (normalizedTerm.startsWith(key) || key.includes(normalizedTerm));
  }))?.labels ?? [];

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

  useEffect(() => {
    if (suggestionsVisible && !query.trim()) {
      void readSearchHistory(customer?.id).then(setRecentSearches);
    }
  }, [customer?.id, query, suggestionsVisible]);

  useEffect(() => {
    activeSuggestionSearch.current?.abort();
    setSuggestions([]);
    setSuggestionLoading(false);
    const normalizedQuery = query.trim();
    const key = normalizeSearch(normalizedQuery);
    if (!suggestionsVisible || key.length < 3) {
      return;
    }

    const controller = new AbortController();
    activeSuggestionSearch.current = controller;
    const timer = setTimeout(() => {
      const cached = suggestionCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        setSuggestions(cached.products);
        setSuggestionLoading(false);
        return;
      }

      setSuggestionLoading(true);
      void productsApi.search(normalizedQuery, { page: 1, pageSize: 6, suggestions: true }, controller.signal)
        .then((res) => {
          if (controller.signal.aborted) return;
          const products = (res.data.data?.products ?? []) as Product[];
          setSuggestions(products);
          if (suggestionCache.size >= 100) suggestionCache.delete(suggestionCache.keys().next().value ?? key);
          suggestionCache.set(key, { products, expiresAt: Date.now() + SUGGESTION_CACHE_TTL });
        })
        .catch(() => { if (!controller.signal.aborted) setSuggestions([]); })
        .finally(() => { if (!controller.signal.aborted) setSuggestionLoading(false); });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, suggestionsVisible]);

  const handleSearch = useCallback(async (searchTerm = query) => {
    const normalizedQuery = searchTerm.trim();
    setQuery(normalizedQuery);
    setSuggestionsVisible(false);
    void rememberSearch(normalizedQuery, customer?.id);
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
  }, [customer?.id, query, category, section, sort, price]);

  useEffect(() => {
    const initialQuery = typeof params.q === "string" ? params.q : "";
    if (!initialQuery.trim() || initialQueryHandled.current === initialQuery) return;
    initialQueryHandled.current = initialQuery;
    setSearched(false);
    setSuggestionsVisible(false);
    setQuery(initialQuery);
    // The search screen remains the single source of filtering behavior.
  }, [params.q]);

  useEffect(() => {
    if (initialQueryHandled.current !== query || !query.trim() || searched) return;
    void handleSearch();
  }, [handleSearch, query, searched]);

  useEffect(() => () => {
    activeSearch.current?.abort();
    activeSuggestionSearch.current?.abort();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
      </View>

      {/* Campo de busca */}
      <View style={styles.searchArea}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={(value) => { setQuery(value); setSuggestionsVisible(true); }}
              onFocus={() => setSuggestionsVisible(true)}
              onBlur={() => setTimeout(() => setSuggestionsVisible(false), 180)}
              onSubmitEditing={() => { void handleSearch(); }}
              placeholder="Buscar bijuterias, perfumes..."
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              autoFocus
              autoCorrect={false}
              accessibilityLabel="Buscar produtos, categorias, marcas e códigos"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => {
                activeSearch.current?.abort();
                activeSuggestionSearch.current?.abort();
                setQuery("");
                setResults([]);
                setSuggestions([]);
                setSearched(false);
                setLoading(false);
                setFailed(false);
                setSuggestionsVisible(true);
              }} accessibilityLabel="Limpar busca">
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={() => { void handleSearch(); }} accessibilityRole="button">
            <Text style={styles.searchBtnText}>Buscar</Text>
          </TouchableOpacity>
        </View>
        {suggestionsVisible && (
          <View style={styles.suggestionPanel}>
            <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled>
            {!query.trim() ? (
              <>
                {recentSearches.length > 0 && (
                  <View style={styles.suggestionSection}>
                    <View style={styles.suggestionHeader}>
                      <Text style={styles.suggestionSectionTitle}>Pesquisas recentes</Text>
                      <TouchableOpacity onPress={() => {
                        void AsyncStorage.removeItem(searchHistoryKey(customer?.id)).catch(() => undefined);
                        setRecentSearches([]);
                      }} accessibilityRole="button">
                        <Text style={styles.clearHistory}>Limpar</Text>
                      </TouchableOpacity>
                    </View>
                    {recentSearches.map((item) => (
                      <TouchableOpacity key={item} style={styles.recentRow} onPress={() => { void handleSearch(item); }}>
                        <Ionicons name="time-outline" size={17} color={Colors.textMuted} />
                        <Text style={styles.suggestionText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <Text style={styles.suggestionSectionTitle}>Categorias</Text>
                <View style={styles.suggestionChips}>
                  {categories.slice(0, 6).map((item) => (
                    <TouchableOpacity key={item.slug} style={styles.suggestionChip} onPress={() => {
                      setSuggestionsVisible(false);
                      router.push(`/produtos?category=${encodeURIComponent(item.slug)}`);
                    }}>
                      <Text style={styles.suggestionChipText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : query.trim().length < 3 ? (
              <Text style={styles.suggestionHint}>Digite mais {3 - query.trim().length} caractere{query.trim().length === 1 ? "" : "s"} para ver sugestões.</Text>
            ) : (
              <>
                {suggestedCorrection && (
                  <TouchableOpacity style={styles.recentRow} onPress={() => { void handleSearch(suggestedCorrection); }}>
                    <Ionicons name="search-outline" size={17} color={Colors.primary} />
                    <Text style={styles.suggestionText}>Você quis dizer <Text style={styles.suggestionStrong}>{suggestedCorrection}</Text>?</Text>
                  </TouchableOpacity>
                )}
                {relatedTerms.length > 0 && (
                  <View style={styles.suggestionSection}>
                    <Text style={styles.suggestionSectionTitle}>Sugestões de busca</Text>
                    <View style={styles.suggestionChips}>
                      {relatedTerms.map((term) => (
                        <TouchableOpacity key={term} style={styles.suggestionChip} onPress={() => { void handleSearch(term); }}>
                          <Text style={styles.suggestionChipText}>{term}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {matchingCategories.length > 0 && (
                  <View style={styles.suggestionSection}>
                    <Text style={styles.suggestionSectionTitle}>Categorias</Text>
                    {matchingCategories.map((item) => (
                      <TouchableOpacity key={item.slug} style={styles.recentRow} onPress={() => {
                        setSuggestionsVisible(false);
                        router.push(`/produtos?category=${encodeURIComponent(item.slug)}`);
                      }}>
                        <Ionicons name="grid-outline" size={17} color={Colors.primary} />
                        <Text style={styles.suggestionText}>{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <Text style={styles.suggestionSectionTitle}>Produtos</Text>
                {suggestionLoading && suggestions.length === 0 ? <Text style={styles.suggestionHint}>Buscando sugestões…</Text> : null}
                {suggestions.map((item) => {
                  const price = item.promotionalPrice && item.promotionalPrice < item.price ? item.promotionalPrice : item.price;
                  return (
                    <TouchableOpacity key={item.id} style={styles.productSuggestion} onPress={() => {
                      void rememberSearch(query, customer?.id);
                      setSuggestionsVisible(false);
                      router.push({ pathname: "/produto/[id]", params: { id: item.id } });
                    }}>
                      <Image source={{ uri: item.image ?? item.images[0]?.url }} style={styles.suggestionImage} contentFit="cover" />
                      <View style={styles.productSuggestionInfo}>
                        <Text numberOfLines={2} style={styles.suggestionText}>{item.name}</Text>
                        <Text style={styles.suggestionPrice}>{formatPrice(price)}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
                {!suggestionLoading && suggestions.length === 0 && matchingCategories.length === 0 ? (
                  <Text style={styles.suggestionHint}>Nenhum produto relacionado encontrado.</Text>
                ) : null}
                <TouchableOpacity style={styles.viewAllSuggestion} onPress={() => { void handleSearch(); }}>
                  <Text style={styles.viewAllText}>Ver todos os resultados para “{query.trim()}”</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </>
            )}
            </ScrollView>
          </View>
        )}
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
            <View style={[styles.productCell, { width: productCellWidth }]}>
              <ProductCard product={item} compact />
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
  searchArea: { position: "relative", zIndex: 20, elevation: 20 },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.base,
    gap: 10,
    marginBottom: 16,
  },
  suggestionPanel: {
    position: "absolute",
    zIndex: 30,
    elevation: 24,
    top: 54,
    left: Spacing.base,
    right: Spacing.base,
    maxHeight: 420,
    overflow: "hidden",
    padding: 10,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "#f5d6e3",
    backgroundColor: Colors.surface,
    shadowColor: "#7a1b46",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  suggestionSection: { marginBottom: 8, paddingBottom: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  suggestionHeader: { minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  suggestionSectionTitle: { marginHorizontal: 4, marginTop: 4, marginBottom: 5, color: Colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  clearHistory: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: "700" },
  recentRow: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 5 },
  suggestionText: { flex: 1, color: Colors.textPrimary, fontSize: FontSizes.sm },
  suggestionStrong: { color: Colors.primary, fontWeight: "800" },
  suggestionHint: { paddingHorizontal: 5, paddingVertical: 10, color: Colors.textMuted, fontSize: FontSizes.sm },
  suggestionChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 2, paddingBottom: 5 },
  suggestionChip: { maxWidth: "100%", paddingHorizontal: 10, paddingVertical: 8, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: "#fff8fb" },
  suggestionChipText: { color: Colors.textPrimary, fontSize: FontSizes.xs, fontWeight: "600" },
  productSuggestion: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  suggestionImage: { width: 48, height: 48, borderRadius: BorderRadius.md, backgroundColor: "#fff0f5" },
  productSuggestionInfo: { flex: 1, gap: 3 },
  suggestionPrice: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "800" },
  viewAllSuggestion: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 5, marginTop: 4 },
  viewAllText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "800" },
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
  row: { gap: 8 },
  list: { paddingHorizontal: 8, paddingTop: Spacing.base, paddingBottom: Spacing.base, gap: 8 },
  productCell: { flexGrow: 0, flexShrink: 0 },
  emptyList: { flexGrow: 1 },
  resultCount: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: 8 },
});
