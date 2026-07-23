import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { categoriesApi } from "@/services/api";
import { getMobileProductCount, getVisibleMobileCategories } from "@/lib/catalogVisibility";

const CATEGORY_EMOJIS: Record<string, string> = {
  bijuterias: "💍",
  acessorios: "👜",
  perfumes: "🌸",
  presentes: "🎁",
  "roupas-femininas": "👗",
  "roupas-masculinas": "👔",
  capinhas: "📱",
  beleza: "💄",
  decoracao: "🏡",
  oculos: "🕶️",
  promocoes: "🏷️",
  novidades: "✨",
};

interface Category {
  id: string; name: string; slug: string; active: boolean;
  _count?: { products: number };
  mobileProductCount?: number | null;
}

export default function CategoriasScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoriesApi.list()
      .then((res) => setCategories(getVisibleMobileCategories(res.data.data ?? [], { includeAdult: true })))
      .finally(() => setLoading(false));
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
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(item.slug === "sex-shop" ? "/categoria/sex-shop" : `/produtos?category=${item.slug}`)}
            activeOpacity={0.8}
          >
            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>
                {CATEGORY_EMOJIS[item.slug] ?? "🛍️"}
              </Text>
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
            {getMobileProductCount(item) > 0 && (
              <Text style={styles.productCount}>
                {getMobileProductCount(item)} {getMobileProductCount(item) === 1 ? "produto" : "produtos"}
              </Text>
            )}
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
  row: { gap: 12 },
  list: { padding: Spacing.base, gap: 12 },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius["2xl"],
    padding: 20,
    alignItems: "center",
    gap: 10,
    ...Shadows.sm,
  },
  emojiContainer: {
    width: 56, height: 56,
    backgroundColor: Colors.pinkSoft,
    borderRadius: BorderRadius.xl,
    alignItems: "center", justifyContent: "center",
  },
  emoji: { fontSize: 28 },
  categoryName: {
    fontSize: FontSizes.base,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  productCount: { fontSize: FontSizes.xs, color: Colors.textMuted },
});
