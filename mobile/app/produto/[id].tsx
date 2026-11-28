import { goBackOr } from "@/lib/navigation";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { catalogAttributeChoices, catalogOptionMatrix, catalogSelectionPhoto, chooseCatalogAttribute, resolveCatalogCombination } from "@shared/catalog-options";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, InteractionManager, LayoutAnimation, Platform, UIManager, Alert, Share,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { productsApi, reviewsApi, favoritesApi } from "@/services/api";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import { MasonryColumns } from "@/components/product/MasonryColumns";
import { useProductFavorites } from "@/hooks/useProductFavorites";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ResilientProductImage } from "@/components/product/ResilientProductImage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://kabijoux.com.br";
function resolveUrl(url?: string | null, version?: string | null): string | null {
  if (!url) return null;
  const resolved = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  if (!version) return resolved;
  return `${resolved}${resolved.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function resolveProductPhoto(productId: string, url?: string | null, version?: string | null, variationId?: string) {
  if (!url || Platform.OS !== "ios") return resolveUrl(url, version);
  try {
    const photo = new URL(url, API_BASE_URL);
    const host = photo.hostname.toLowerCase();
    if (photo.protocol !== "https:" || host === "bling.com.br" || host.endsWith(".bling.com.br") || host.includes("orgbling")) {
      return null;
    }

    const prefix = "/storage/v1/object/public/products/catalog/products/";
    if (photo.pathname.startsWith(prefix)) {
      const scope = photo.pathname.slice(prefix.length);
      const gallery = scope.startsWith(`${productId}/gallery/`);
      const variation = variationId && scope.startsWith(`${productId}/variations/${variationId}/`);
      if (!gallery && !variation) return null;
    }
    if (version) photo.searchParams.set("v", version);
    return photo.toString();
  } catch {
    return null;
  }
}

function sameCatalogPhoto(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  try {
    const normalize = (value: string) => {
      const url = new URL(value, API_BASE_URL);
      url.searchParams.delete("v");
      return url.toString();
    };
    return normalize(left) === normalize(right);
  } catch {
    return left === right;
  }
}

const BENEFIT_CARDS = [
  { icon: "car-outline" as const, title: "Opções de entrega", subtitle: "Exibidas no checkout" },
  { icon: "shield-checkmark-outline" as const, title: "Compra segura", subtitle: "Dados protegidos" },
  { icon: "diamond-outline" as const, title: "Catálogo organizado", subtitle: "Detalhes por produto" },
  { icon: "person-outline" as const, title: "Controle da conta", subtitle: "Edição e exclusão" },
];

const PAYMENT_METHODS = [
  { name: "Pagamento seguro", mark: "pix", color: "#22c7b8" },
];

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const RELATED_CARD_WIDTH = (SCREEN_WIDTH - Spacing.base * 2 - CARD_GAP) / 2;

const FAQS = [
  {
    q: "Como funciona a entrega?",
    a: "As opções disponíveis, valores e prazos são calculados e exibidos no checkout para o endereço informado.",
  },
  {
    q: "Posso trocar ou devolver o produto?",
    a: "As solicitações de troca ou devolução seguem os Termos de Uso e a legislação aplicável. O canal oficial ainda precisa ser informado pela loja.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "O prazo depende da opção de entrega disponível e é mostrado no checkout antes da confirmação.",
  },
  {
    q: "O produto tem garantia?",
    a: "Produtos com defeito ou diferentes do pedido são tratados conforme a legislação aplicável e os Termos de Uso.",
  },
  {
    q: "Quais são as formas de pagamento?",
    a: "As formas habilitadas, como Pix, cartão ou boleto, são apresentadas com segurança no checkout.",
  },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type Variation = {
  id: string;
  name: string;
  value: string;
  sku?: string | null;
  imageUrl?: string | null;
  stock: number;
  available?: boolean;
  priceModifier?: number;
  isDefault?: boolean;
  order?: number;
};

type Product = {
  assortedColors?: boolean;
  purchaseReviewRequired?: boolean;
  linkedOptions?: { id: string; label: string; name?: string; sku?: string; stock?: number; available: boolean; imageUrl: string | null; price?: number }[];
  fixedColor?: string | null;
  id: string;
  sku?: string | null;
  slug?: string | null;
  name: string;
  description: string | null;
  price: number;
  promotionalPrice?: number | null;
  stock: number;
  sharedVariationStock?: boolean;
  updatedAt?: string | null;
  images: Array<{ url: string; alt?: string }>;
  category: { name: string; slug?: string };
  subcategory?: { name: string } | null;
  isNew?: boolean;
  variations: Variation[];
  brand?: string | null;
  benefits?: string | null;
  howToUse?: string | null;
  composition?: string | null;
  careInstructions?: string | null;
  packageContents?: string | null;
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  customer: { name: string };
};

type RelatedProduct = {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  promotionalPrice?: number | null;
  stock: number;
  images: Array<{ url: string }>;
  isNew?: boolean;
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatCurrency = (v: number) => currencyFormatter.format(v);

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return ""; }
}

function publicText(value?: string | null): string | null {
  if (!value) return null;
  const text = value.trim();
  if (text.length < 3) return null;
  const blocked = [
    "nao informado", "nao disponivel", "necessita revisao", "revisao",
    "informacoes tecnicas pendentes", "importado da bling",
  ];
  const norm = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return blocked.some((t) => norm.includes(t)) ? null : text;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons key={s} name={s <= Math.round(rating) ? "star" : "star-outline"} size={size} color="#f59e0b" />
      ))}
    </View>
  );
}

function RelatedSection({ title, products, favoriteIds, onFavoriteToggle }: {
  title: string;
  products: RelatedProduct[];
  favoriteIds: Record<string, string>;
  onFavoriteToggle: (productId: string) => void;
}) {
  const router = useRouter();
  if (!products.length) return null;
  return (
    <View style={styles.cardSection}>
      <Text style={styles.relatedBadge}>SELEÇÃO KA BIJOUX</Text>
      <View style={styles.relatedTitleRow}>
        <Text style={styles.relatedTitle}>{title}</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)")}>
          <Text style={styles.relatedLink}>Ver vitrine →</Text>
        </TouchableOpacity>
      </View>
      <MasonryColumns
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={(item) => <ProductCard product={item} showFavorite isFavorite={Boolean(favoriteIds[item.id])} onFavoriteToggle={onFavoriteToggle} />}
      />
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ProdutoScreen() {
  const { id, previewName, previewPrice, previewPromotionalPrice, previewStock, previewImage } = useLocalSearchParams<{
    id: string;
    previewName?: string;
    previewPrice?: string;
    previewPromotionalPrice?: string;
    previewStock?: string;
    previewImage?: string;
  }>();
  const router = useRouter();
  const { favoriteIds, toggleFavorite: toggleProductFavorite } = useProductFavorites();
  const insets = useSafeAreaInsets();
  const addItem = useCartStore((state) => state.addItem);
  const buyNow = useCartStore((state) => state.buyNow);
  const customer = useAuthStore((state) => state.customer);

  const [product, setProduct] = useState<Product | null>(() => {
    if (!previewName || !previewPrice) return null;
    const promotionalPrice = previewPromotionalPrice ? Number(previewPromotionalPrice) : null;
    return {
      id,
      name: previewName,
      description: null,
      price: Number(previewPrice),
      promotionalPrice: Number.isFinite(promotionalPrice) ? promotionalPrice : null,
      stock: Number(previewStock ?? 0),
      // The listing already loaded this official catalog image. Show it while
      // the product request is in flight; the response below confirms it
      // belongs to this product before it is kept on screen.
      images: previewImage ? [{ url: previewImage }] : [],
      category: { name: "" },
      variations: [],
    };
  });
  const [linkedFamilyOptions, setLinkedFamilyOptions] = useState<Product["linkedOptions"]>(undefined);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<(string | null)[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [togglingFav, setTogglingFav] = useState(false);
  const [variationError, setVariationError] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [cartAction, setCartAction] = useState<"add" | "buy" | null>(null);
  const [pendingLinkedOptionId, setPendingLinkedOptionId] = useState<string | null>(null);
  const [secondaryVisible, setSecondaryVisible] = useState(false);
  const cartActionLock = useRef(false);
  const skipProductFetchRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (skipProductFetchRef.current === id) {
      skipProductFetchRef.current = null;
      return;
    }
    let current = true;
    const controller = new AbortController();
    setSecondaryVisible(false);
    setLoading(true);
    setNotFound(false);
    setSelectedPhoto(null);
    setVariationError(false);
    productsApi.getById(id, controller.signal)
      .then(async (res) => {
        if (!current) return;
        const p: Product = res.data.data.product;
        if (p.id !== id && p.slug !== id) {
          setNotFound(true);
          return;
        }
        const savedPhoto = await AsyncStorage.getItem(`catalog-photo:${p.id}`).catch(() => null);
        if (!current) return;
        const confirmedImages = p.images.map((image) => image.url);
        const confirmedSavedPhoto = confirmedImages.find((url) => sameCatalogPhoto(url, savedPhoto)) ?? null;
        const confirmedPreviewPhoto = confirmedImages.find((url) => sameCatalogPhoto(url, previewImage)) ?? null;
        setProduct(p);
        if (p.linkedOptions?.some((option) => option.id === p.id)) {
          setLinkedFamilyOptions((current) => {
            if (!current?.length) return p.linkedOptions;
            const next = new Map(current.map((option) => [option.id, option]));
            for (const option of p.linkedOptions ?? []) next.set(option.id, option);
            return [...next.values()];
          });
        }
        setSelectedPhoto(confirmedSavedPhoto ?? confirmedPreviewPhoto);
        setRelated(res.data.data.related ?? []);
        setSelectedVariation(null);
        setSelectedAttributes([]);
        setQuantity(1);
      })
      .catch(() => { if (current) setNotFound(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [id]);

  useEffect(() => {
    if (loading || !product) return;
    const task = InteractionManager.runAfterInteractions(() => setSecondaryVisible(true));
    return () => task.cancel();
  }, [loading, product?.id]);

  useEffect(() => {
    if (!product || loading || !secondaryVisible) return;
    let current = true;
    reviewsApi.list(product.id)
      .then((res) => {
        if (!current) return;
        const data = res.data.data;
        setReviews(data.reviews ?? []);
        setAvgRating(data.avgRating ?? 0);
        setReviewsTotal(data.total ?? 0);
      })
      .catch(() => {});
    return () => { current = false; };
  }, [product?.id, loading, secondaryVisible]);

  useEffect(() => {
    if (!customer || !product) {
      setFavoriteId(null);
      return;
    }
    let current = true;
    favoritesApi.list()
      .then((res) => {
        if (!current) return;
        const list: Array<{ favoriteId: string; id: string; slug?: string | null }> = res.data.data ?? [];
        const found = list.find((f) =>
          f.id === product.id ||
          (product.slug ? f.slug === product.slug : false) ||
          f.id === id
        );
        setFavoriteId(found?.favoriteId ?? null);
      })
      .catch(() => {});
    return () => { current = false; };
  }, [customer, product?.id, product?.slug, id]);

  async function toggleFavorite() {
    if (!customer) { router.push("/(auth)/entrada"); return; }
    if (!product) return;
    if (togglingFav) return;
    setTogglingFav(true);
    try {
      if (favoriteId) {
        await favoritesApi.remove(favoriteId);
        setFavoriteId(null);
      } else {
        const res = await favoritesApi.create(product.id);
        setFavoriteId(res.data.data.id);
      }
    } catch { } finally { setTogglingFav(false); }
  }

  async function shareProduct() {
    if (!product) return;
    const productPath = product.slug ?? product.id;
    try {
      await Share.share({
        title: product.name,
        message: `${product.name}\n${API_BASE_URL}/produto/${encodeURIComponent(productPath)}`,
      });
    } catch {
      Alert.alert("Não foi possível compartilhar agora", "Tente novamente.");
    }
  }

  function handleSelectVariation(v: Variation) {
    if (!product || !v.sku?.trim() || (product.sharedVariationStock ? product.stock : v.stock) <= 0) return;
    setVariationError(false);
    setSelectedVariation(v.id);
    setQuantity(1);
  }

  async function chooseLinkedProduct(option: NonNullable<Product["linkedOptions"]>[number]) {
    if (!option.available || option.id === product?.id || pendingLinkedOptionId) return;
    setPendingLinkedOptionId(option.id);
    try {
      const response = await productsApi.getById(option.id);
      const nextProduct: Product = response.data.data.product;
      if (nextProduct.id !== option.id) throw new Error("O produto vinculado retornou outro cadastro.");
      setProduct(nextProduct);
      if (nextProduct.linkedOptions?.some((item) => item.id === nextProduct.id)) {
        setLinkedFamilyOptions((current) => {
          if (!current?.length) return nextProduct.linkedOptions;
          const next = new Map(current.map((item) => [item.id, item]));
          for (const item of nextProduct.linkedOptions ?? []) next.set(item.id, item);
          return [...next.values()];
        });
      }
      setRelated(response.data.data.related ?? []);
      setSelectedPhoto(null);
      setSelectedVariation(null);
      setSelectedAttributes([]);
      setQuantity(1);
      setVariationError(false);
      setSecondaryVisible(false);
      const nextRouteId = nextProduct.slug ?? nextProduct.id;
      skipProductFetchRef.current = nextRouteId;
      router.setParams({ id: nextRouteId });
    } catch {
      Alert.alert("Não foi possível carregar esta opção", "Tente novamente.");
    } finally {
      setPendingLinkedOptionId(null);
    }
  }

  async function handleCartAction(action: "add" | "buy") {
    if (!product || loading || product.purchaseReviewRequired || product.linkedOptions?.find((option) => option.id === product.id)?.available === false || (product.id !== id && product.slug !== id)) return;
    if (cartActionLock.current) return;
    if (!customer) {
      router.push("/(auth)/entrada");
      return;
    }
    const selectedOption = activeVariation;
    if (product.variations.length > 0 && !selectedOption) {
      setVariationError(true);
      return;
    }
    const availableStock = product.sharedVariationStock ? product.stock : selectedOption?.stock ?? product.stock;
    if (quantity > availableStock) {
      Alert.alert("Estoque insuficiente", "Reduza a quantidade ou escolha outra opção.");
      return;
    }
    cartActionLock.current = true;
    setCartAction(action);
    try {
      const photo = galleryPhotos[selectedImage]?.url;
      if (action === "buy") {
        const direct = await buyNow(product.id, quantity, selectedOption?.id, photo);
        useCheckoutStore.getState().reset({ preserveAddress: true });
        router.push({ pathname: "/checkout", params: { direct } });
        return;
      }
      await addItem(product.id, quantity, selectedOption?.id, photo);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      Alert.alert("Erro", "Nao foi possivel adicionar o produto ao carrinho.");
    } finally {
      cartActionLock.current = false;
      setCartAction(null);
    }
  }

  function toggleFaq(index: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq((prev) => (prev === index ? null : index));
  }

  if (!notFound && ((loading && !product) || (product && product.id !== id && product.slug !== id && !pendingLinkedOptionId))) {
    return <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  if (notFound || !product) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={[styles.emptyText, { marginTop: 12 }]}>Produto não encontrado.</Text>
        <TouchableOpacity onPress={() => goBackOr(router, "/produtos")} style={{ marginTop: 8 }}>
          <Text style={[styles.emptyText, { color: Colors.primary }]}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Computed values ────────────────────────────────────────────────────────

  const hasVariations = product.variations.length > 0;
  const linkedOptions = linkedFamilyOptions?.length ? linkedFamilyOptions : product.linkedOptions ?? [];
  const matrix = product.variations.length > 1 ? catalogOptionMatrix(product.variations, (option) => option) : null;
  const activeVariation = matrix ? resolveCatalogCombination(matrix, selectedAttributes) : product.variations.find((v) => v.id === selectedVariation) ??
    (product.variations.length === 1 && product.variations[0].sku?.trim() ? product.variations[0] : null);
  const selectedLinked = linkedOptions.find((option) => option.id === product.id);
  const photoUrls = activeVariation ? [activeVariation.imageUrl] : product.images.map(({ url }) => url);
  const galleryPhotos = [...new Set(photoUrls)].flatMap((url) => {
    if (!url) return [];
    const uri = resolveProductPhoto(product.id, url, product.updatedAt, activeVariation?.id);
    return uri ? [{ url, uri }] : [];
  });
  const selectionPhoto = matrix && !activeVariation ? catalogSelectionPhoto(matrix, selectedAttributes,
    (option) => resolveProductPhoto(product.id, option.imageUrl, product.updatedAt, option.id),
  ) : null;
  const galleryImages = selectionPhoto ? [selectionPhoto] : galleryPhotos.map(({ uri }) => uri);
  const selectedImage = selectionPhoto ? 0 : Math.max(0, galleryPhotos.findIndex(({ url }) => url === selectedPhoto));
  function selectGalleryPhoto(index: number) {
    const photo = galleryPhotos[index]?.url;
    if (activeVariation || selectionPhoto || !product || !photo) return;
    setSelectedPhoto(photo);
    void AsyncStorage.setItem(`catalog-photo:${product.id}`, photo).catch(() => undefined);
  }
  const isAvailable = !product.purchaseReviewRequired && selectedLinked?.available !== false && (hasVariations && !product.sharedVariationStock
    ? product.variations.some((v) => v.sku?.trim() && v.stock > 0 && v.available !== false && Boolean(v.imageUrl))
    : product.stock > 0);
  const activeStock = product.sharedVariationStock ? product.stock : activeVariation?.stock ?? product.stock;
  const matrixPurchaseBlocked = Boolean(matrix && (!activeVariation || !activeVariation.sku?.trim() || activeVariation.available === false || activeStock <= 0 || !activeVariation.imageUrl));
  const priceModifier = Number(activeVariation?.priceModifier ?? 0);
  const basePrice = product.promotionalPrice && product.promotionalPrice < product.price ? product.promotionalPrice : product.price;
  const hasPromo = !!product.promotionalPrice && product.promotionalPrice < product.price;
  const price = Number(basePrice) + priceModifier;
  const discount = hasPromo ? Math.round(((Number(product.price) - Number(product.promotionalPrice!)) / Number(product.price)) * 100) : 0;
  const variationNames = new Set(product.variations.map((variation) => variation.name));
  const variationGroupName = variationNames.size === 1 ? product.variations[0].name : "Opção";
  const hasCommercialSelector = linkedOptions.length > 1 || Boolean(matrix) || product.variations.length > 1;
  const selectedOptionSku = activeVariation?.sku ?? (selectedLinked ? product.sku : null);

  const optionSelector = (
    <>
      {product.purchaseReviewRequired && (
        <View style={[styles.section, styles.optionSection]}>
          <Text style={styles.selectedVariationLabel}>Este produto está em revisão e ainda não pode ser comprado.</Text>
        </View>
      )}
      {linkedOptions.length > 1 && (
        <View style={[styles.section, styles.optionSection]}>
          <Text style={styles.sectionTitle}>Escolha a opção</Text>
          <View style={styles.variations}>
            {linkedOptions.map((option) => (
              <TouchableOpacity key={option.id} accessibilityRole="button"
                    disabled={!option.available || pendingLinkedOptionId !== null}
                    accessibilityState={{ selected: option.id === product.id || option.id === pendingLinkedOptionId, disabled: !option.available || pendingLinkedOptionId !== null }}
                    style={[styles.variationChip, (option.id === product.id || option.id === pendingLinkedOptionId) && styles.variationChipActive, !option.available && { opacity: 0.45 }]}
                    onPress={() => { void chooseLinkedProduct(option); }}>
                <View style={styles.variationWithImage}>
                  {option.imageUrl && <ResilientProductImage sources={[option.imageUrl]} style={styles.variationThumb} contentFit="contain" compact />}
                  <View>
                        <Text style={[styles.variationText, (option.id === product.id || option.id === pendingLinkedOptionId) && styles.variationTextActive]}>{option.label}</Text>
                    <Text style={styles.variationHint}>{!option.available ? (option.stock === 0 ? "Esgotado" : "Foto oficial pendente") : option.price !== undefined ? formatCurrency(option.price) : ""}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {!product.purchaseReviewRequired && matrix && (
        <View style={[styles.section, styles.optionSection]}>
          {matrix.names.map((name, axis) => (
            <View key={name} style={{ marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>{name}: {selectedAttributes[axis] ?? "Escolha"}</Text>
              <View style={styles.variations}>
                {catalogAttributeChoices(matrix, axis,
                  (option) => option.available === true && Boolean(option.sku?.trim() && (product.sharedVariationStock ? product.stock : option.stock) > 0 && option.imageUrl),
                  (option) => resolveProductPhoto(product.id, option.imageUrl, product.updatedAt, option.id),
                ).map((choice) => {
                  const selected = selectedAttributes[axis] === choice.value;
                  return (
                    <TouchableOpacity key={choice.value} accessibilityRole="button"
                      accessibilityLabel={`${name}: ${choice.value}`}
                      accessibilityState={{ selected, disabled: !choice.available }}
                      disabled={!choice.available}
                      style={[styles.variationChip, selected && styles.variationChipActive, !choice.available && styles.variationChipUnavailable]}
                      onPress={() => {
                        setSelectedAttributes(chooseCatalogAttribute(matrix, selectedAttributes, axis, choice.value,
                          (option) => option.available === true && Boolean(option.sku?.trim() && (product.sharedVariationStock ? product.stock : option.stock) > 0 && option.imageUrl),
                        ));
                        setQuantity(1);
                        setVariationError(false);
                      }}>
                      <View style={styles.variationWithImage}>
                        {choice.photo && <ResilientProductImage sources={[choice.photo]} style={styles.variationThumb} contentFit="contain" compact />}
                        <Text style={[styles.variationText, selected && styles.variationTextActive]}>{choice.value}{!choice.available && " · Indisponível"}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
          {!activeVariation && <Text style={styles.variationHint}>Escolha todos os atributos para comprar.</Text>}
        </View>
      )}
      {!product.purchaseReviewRequired && !matrix && product.variations.length > 1 && (
        <View style={[styles.section, styles.optionSection]}>
          <View style={styles.variationHeader}>
            <Text style={styles.sectionTitle}>
              {({ cor: "Escolha a cor", modelo: "Escolha o modelo", tamanho: "Escolha o tamanho", estampa: "Escolha a estampa", artista: "Escolha o artista" } as Record<string, string>)[variationGroupName.trim().toLowerCase()] ?? `Escolha: ${variationGroupName}`}
            </Text>
          </View>
          {variationError && <Text style={styles.variationErrorText}>Selecione uma opção antes de adicionar ao carrinho.</Text>}
          <View style={styles.variations}>
            {product.variations.map((v) => {
              const isSelected = selectedVariation === v.id;
              const unavailable = !v.sku?.trim() || v.available === false || !v.imageUrl || (product.sharedVariationStock ? product.stock : v.stock) <= 0;
              const photo = resolveProductPhoto(product.id, v.imageUrl, product.updatedAt, v.id);
              return (
                <TouchableOpacity key={v.id}
                  style={[styles.variationChip, isSelected && styles.variationChipActive, unavailable && styles.variationChipUnavailable, variationError && !selectedVariation && styles.variationChipError]}
                  onPress={() => handleSelectVariation(v)} disabled={unavailable}
                  accessibilityRole="button" accessibilityState={{ selected: isSelected, disabled: unavailable }}
                  accessibilityLabel={`${v.name}: ${v.value}`}>
                  <View style={styles.variationWithImage}>
                    {photo && <ResilientProductImage sources={[photo]} style={styles.variationThumb} contentFit="contain" compact />}
                    <Text style={[styles.variationText, isSelected && styles.variationTextActive, unavailable && styles.variationTextUnavailable]}>{variationNames.size === 1 ? v.value : `${v.name}: ${v.value}`}</Text>
                  </View>
                  {unavailable && <View style={styles.strikeThrough} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      {hasCommercialSelector && selectedOptionSku && (activeVariation || selectedLinked) && !product.purchaseReviewRequired && (
        <View style={styles.selectedOptionSummary} accessibilityLiveRegion="polite">
          {selectedOptionSku && <Text style={styles.selectedOptionSku}>SKU {selectedOptionSku}</Text>}
        </View>
      )}
    </>
  );

  const description = publicText(product.description);
  const benefits = publicText(product.benefits);
  const howToUse = publicText(product.howToUse);
  const material = publicText(product.composition);
  const care = publicText(product.careInstructions);
  const packageContents = publicText(product.packageContents);
  const hasUsage = !!(howToUse || material || care || packageContents);

  const usageSections = [
    { title: "Modo de uso", value: howToUse },
    { title: "Material e composição", value: material },
    { title: "Cuidados", value: care },
    { title: "Conteúdo da embalagem", value: packageContents },
  ].filter((s): s is { title: string; value: string } => Boolean(s.value));

  const caracteristicaItems = [
    `Produto: ${product.name}`,
    `Categoria: ${product.category.name}`,
    ...(product.subcategory ? [`Subcategoria: ${product.subcategory.name}`] : []),
    ...(publicText(product.brand) ? [`Marca: ${product.brand!}`] : []),
  ];

  const relatedA = related.slice(0, 4);
  const relatedB = related.slice(4, 8);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Botões flutuantes */}
        <View style={styles.floatingBtns}>
          <TouchableOpacity onPress={() => goBackOr(router, "/produtos")}>
            <View style={styles.floatingBtnInner}>
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </View>
          </TouchableOpacity>
          <View style={styles.floatingRightActions}>
            <TouchableOpacity onPress={shareProduct} accessibilityLabel="Compartilhar produto">
              <View style={styles.floatingBtnInner}>
                <Ionicons name="share-social-outline" size={19} color={Colors.primary} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFavorite} disabled={togglingFav} accessibilityLabel="Favoritar produto">
              <View style={[styles.floatingBtnInner, favoriteId ? styles.favBtnActive : null]}>
                <Ionicons name={favoriteId ? "heart" : "heart-outline"} size={20} color={favoriteId ? "#fff" : Colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Imagem principal */}
        <View style={styles.imagesContainer}>
          <ProductImageGallery
            key={`${product.id}:${activeVariation?.id ?? ""}`}
            images={galleryImages}
            productName={activeVariation ? `${product.name} — ${activeVariation.value}` : product.name}
            selectedIndex={Math.min(selectedImage, Math.max(0, galleryImages.length - 1))}
            onSelectedIndexChange={selectGalleryPhoto}
          />
          {hasPromo && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeSmall}>até</Text>
              <Text style={styles.discountBadgePct}>{discount}%</Text>
              <Text style={styles.discountBadgeSmall}>off</Text>
            </View>
          )}
          {!isAvailable && (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>Esgotado</Text>
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {galleryImages.length > 1 && (
          <View>
          <View style={styles.galleryCaption}>
            <Text style={styles.sectionTitle}>Fotos do produto</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>
            {galleryImages.map((uri, idx) => (
              <TouchableOpacity key={`${uri}-${idx}`} onPress={() => selectGalleryPhoto(idx)}
                accessibilityRole="button" accessibilityLabel={`Ver foto ${idx + 1}`} accessibilityState={{ selected: idx === selectedImage }}
                style={[styles.thumbnail, idx === selectedImage && styles.thumbnailActive]}>
                <ResilientProductImage sources={[uri]} style={styles.thumbnailImage} contentFit="contain" compact />
              </TouchableOpacity>
            ))}
          </ScrollView>
          </View>
        )}

        {optionSelector}

        {/* Purchase panel */}
        <View style={styles.purchasePanel}>
          {/* Badges */}
          <View style={styles.badgesRow}>
            <View style={styles.badgeKA}><Text style={styles.badgeKAText}>KA Bijoux</Text></View>
          </View>

          <Text style={styles.category}>{product.category.name}</Text>
          <Text style={styles.name}>{product.name}</Text>

          {/* Rating summary */}
          <View style={styles.ratingRow}>
            <View style={{ flexDirection: "row", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name={s <= Math.round(avgRating) ? "star" : "star-outline"} size={14} color="#f59e0b" />
              ))}
            </View>
            {reviewsTotal > 0 ? (
              <>
                <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>{reviewsTotal} {reviewsTotal === 1 ? "avaliação" : "avaliações"}</Text>
              </>
            ) : (
              <Text style={styles.ratingCount}>Sem avaliações</Text>
            )}
          </View>

          {/* Preço */}
          <View style={styles.priceBox}>
            <Text style={styles.priceBoxLabel}>Preço KA Bijoux</Text>
            {hasPromo && (
              <View style={styles.priceBoxPromoRow}>
                <Text style={styles.originalPrice}>{formatCurrency(Number(product.price))}</Text>
                <View style={styles.discountPill}>
                  <Text style={styles.discountPillText}>{discount}% OFF</Text>
                </View>
              </View>
            )}
            <Text style={styles.price}>{formatCurrency(price)}</Text>
            <Text style={styles.installmentText}>Pagamento seguro via Pix</Text>
            <Text style={styles.availabilityText}>
              {(matrix || product.variations.length > 1) && !activeVariation ? "Selecione uma opção para consultar a disponibilidade" : activeStock > 0 && isAvailable ? "Em estoque" : "Indisponível"}
            </Text>
          </View>

          {/* Quantidade */}
          <View style={styles.qtyBox}>
            <View>
              <Text style={styles.qtyBoxLabel}>Quantidade</Text>
              <Text style={styles.qtyBoxSub}>Escolha quantos itens adicionar.</Text>
            </View>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.min(activeStock, quantity + 1))} disabled={quantity >= activeStock}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {secondaryVisible ? <>
        {/* ── DESCRIÇÃO ── */}
        <View style={styles.cardSection}>
          <SectionLabel label="Descrição" />
          <View style={styles.card}>
            {description
              ? <Text style={styles.bodyText}>{description}</Text>
              : <Text style={styles.emptyText}>Descrição não disponível.</Text>
            }
            {benefits && (
              <View style={styles.benefitsSection}>
                <Text style={styles.benefitsTitle}>Benefícios</Text>
                <Text style={styles.bodyText}>{benefits}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── CARACTERÍSTICAS ── */}
        <View style={styles.cardSection}>
          <SectionLabel label="Características" />
          <View style={styles.card}>
            <View style={styles.caracterGrid}>
              {caracteristicaItems.map((item) => {
                const colonIdx = item.indexOf(": ");
                const label = colonIdx > -1 ? item.slice(0, colonIdx) : "Detalhe";
                const value = colonIdx > -1 ? item.slice(colonIdx + 2) : item;
                return (
                  <View key={item} style={styles.caracterCard}>
                    <Text style={styles.caracterLabel}>{label.toUpperCase()}</Text>
                    <Text style={styles.caracterValue}>{value}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── MODO DE USO ── */}
        {hasUsage && (
          <View style={styles.cardSection}>
            <SectionLabel label="Modo de Uso" />
            <View style={styles.card}>
              {/* Dark "Cuidados" card */}
              <View style={styles.cuidadosCard}>
                <Text style={styles.cuidadosSmallLabel}>CUIDADOS</Text>
                <Text style={styles.cuidadosTitle}>Use com atenção</Text>
                <View style={styles.cuidadosItem}>
                  <View style={styles.cuidadosNumber}>
                    <Text style={styles.cuidadosNumberText}>1</Text>
                  </View>
                  <Text style={styles.cuidadosText}>Siga as instruções de limpeza indicadas na embalagem do fabricante.</Text>
                </View>
              </View>

              {/* Usage sections */}
              <View style={{ marginTop: 12, gap: 10 }}>
                {usageSections.map((section, idx) => (
                  <View key={section.title} style={styles.usageCard}>
                    <View style={styles.usageCardHeader}>
                      <View style={styles.usageCardNumber}>
                        <Text style={styles.usageCardNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.usageCardTitle}>{section.title}</Text>
                    </View>
                    <Text style={[styles.bodyText, { marginTop: 8 }]}>{section.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── AVALIAÇÕES ── */}
        <View style={styles.cardSection}>
          <SectionLabel label="Avaliações" />
          <View style={styles.card}>
            {reviewsTotal > 0 ? (
              <>
                {/* Resumo */}
                <View style={styles.reviewSummary}>
                  <View style={styles.reviewSummaryLeft}>
                    <Text style={styles.reviewBigNumber}>{avgRating.toFixed(1)}</Text>
                    <StarRow rating={avgRating} size={16} />
                    <Text style={styles.reviewSummaryCount}>{reviewsTotal} {reviewsTotal === 1 ? "cliente avaliou" : "clientes avaliaram"}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12, gap: 10 }}>
                  {reviews.map((rev, idx) => (
                    <View key={rev.id} style={[styles.reviewCard, idx === 1 && styles.reviewCardDark]}>
                      <View style={styles.reviewTop}>
                        <View style={styles.reviewAvatar}>
                          <Text style={styles.reviewAvatarText}>{(rev.customer.name ?? "?").charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={[styles.reviewName, idx === 1 && { color: "#fff" }]}>{rev.customer.name}</Text>
                            <Text style={[styles.reviewDate, idx === 1 && { color: "rgba(255,255,255,0.6)" }]}>{formatDate(rev.createdAt)}</Text>
                          </View>
                          <StarRow rating={rev.rating} size={11} />
                        </View>
                      </View>
                      {rev.comment?.trim() ? (
                        <Text style={[styles.reviewText, idx === 1 && { color: "rgba(255,255,255,0.75)" }]}>{rev.comment.trim()}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>Ainda sem avaliações para este produto.</Text>
            )}
          </View>
        </View>

        {/* ── PERGUNTAS FREQUENTES ── */}
        <View style={styles.cardSection}>
          <SectionLabel label="Perguntas frequentes" />
          <View style={styles.card}>
            <View style={{ gap: 10 }}>
              {FAQS.map((faq, i) => (
                <View key={faq.q} style={styles.faqItem}>
                  <TouchableOpacity style={styles.faqHeader} onPress={() => toggleFaq(i)} activeOpacity={0.75}>
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    <Ionicons
                      name={openFaq === i ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                  {openFaq === i && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.a}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── RELACIONADOS ── */}
        <RelatedSection title="Quem comprou também levou" products={relatedA} favoriteIds={favoriteIds} onFavoriteToggle={toggleProductFavorite} />
        <RelatedSection title="Você também pode gostar" products={relatedB} favoriteIds={favoriteIds} onFavoriteToggle={toggleProductFavorite} />

        {/* ── BENEFITS STRIP ── */}
        <View style={styles.cardSection}>
          <View style={styles.benefitsGrid}>
            {BENEFIT_CARDS.map((b) => (
              <View key={b.title} style={styles.benefitCard}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons name={b.icon} size={26} color="#FF6F9C" />
                </View>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitSubtitle}>{b.subtitle}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── FORMAS DE PAGAMENTO ── */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>FORMAS DE PAGAMENTO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentRow}>
            {PAYMENT_METHODS.map((m) => (
              <View key={m.name} style={styles.paymentCard}>
                <Text style={[styles.paymentMark, { color: m.color }]}>{m.mark}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── FEITO COM AMOR ── */}
        <View style={styles.feitoWrap}>
          <Ionicons name="heart-outline" size={28} color={Colors.primary} />
          <Text style={styles.feitoTitle}>Feito com amor</Text>
          <Text style={styles.feitoSub}>para você brilhar todos os dias.</Text>
        </View>
        </> : null}

      </ScrollView>

      {/* Rodapé */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>Total</Text>
          <Text style={styles.footerPriceValue}>{formatCurrency(price * quantity)}</Text>
        </View>
        <View style={styles.footerActions}>
          <Button label={added ? "✓ Adicionado!" : "Adicionar ao carrinho"} onPress={() => handleCartAction("add")} loading={cartAction === "add"} disabled={loading || !isAvailable || matrixPurchaseBlocked || added || cartAction !== null} style={{ flex: 1 }} size="lg" variant="outline" />
          <Button label="Comprar agora" onPress={() => handleCartAction("buy")} loading={cartAction === "buy"} disabled={loading || !isAvailable || matrixPurchaseBlocked || cartAction !== null} style={{ flex: 1 }} size="lg" />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textMuted, fontStyle: "italic" },

  // Floating buttons
  floatingBtns: { position: "absolute", top: 16, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  floatingRightActions: { flexDirection: "row", gap: 8 },
  floatingBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", ...Shadows.sm },
  favBtnActive: { backgroundColor: Colors.primary },

  // Images
  imagesContainer: { position: "relative", width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: "#fff" },
  mainImage: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  discountBadge: {
    position: "absolute", top: 12, left: 12,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center", justifyContent: "center",
    ...Shadows.md,
  },
  discountBadgeSmall: { color: "rgba(255,220,230,0.9)", fontSize: 8, fontWeight: "900", textTransform: "uppercase" },
  discountBadgePct: { color: "#fff", fontSize: 18, fontWeight: "900", lineHeight: 20 },
  soldOut: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  soldOutText: { color: "#fff", fontWeight: "800", fontSize: FontSizes.xl },
  imageDots: { position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  imageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  imageDotActive: { width: 20, backgroundColor: "#fff" },
  thumbnails: { paddingHorizontal: Spacing.base, paddingRight: Spacing.xl, gap: 8, paddingVertical: 6 },
  galleryCaption: { paddingHorizontal: Spacing.base, paddingTop: 4 },
  thumbnail: { width: 66, height: 66, borderRadius: BorderRadius.lg, overflow: "hidden", borderWidth: 2, borderColor: Colors.borderLight },
  thumbnailActive: { borderColor: Colors.primary },
  thumbnailImage: { width: "100%", height: "100%" },

  // Purchase panel
  purchasePanel: { paddingHorizontal: Spacing.base, paddingTop: 8 },
  badgesRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  badgeKA: { backgroundColor: "#17070C", borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4 },
  badgeKAText: { color: "#fff", fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5 },
  badgeInStock: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeInStockDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
  badgeInStockText: { fontSize: 11, fontWeight: "900", color: "#15803d" },
  badgeOutStock: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeOutStockDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  badgeOutStockText: { fontSize: 11, fontWeight: "900", color: "#dc2626" },

  category: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  name: { fontSize: FontSizes["2xl"], fontWeight: "900", color: Colors.textPrimary, marginTop: 4, lineHeight: 32 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  ratingText: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary },
  ratingCount: { fontSize: FontSizes.xs, fontWeight: "600", color: Colors.textMuted },

  // Price box
  priceBox: { marginTop: 16, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.pinkPale, padding: Spacing.base },
  priceBoxLabel: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5, color: "#8b5c6d" },
  priceBoxPromoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  originalPrice: { fontSize: FontSizes.sm, color: Colors.textMuted, textDecorationLine: "line-through" },
  discountPill: { backgroundColor: "#17070C", borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  discountPillText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  price: { fontSize: 34, fontWeight: "900", color: Colors.primary, lineHeight: 40, marginTop: 4 },
  installmentText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: "600", marginTop: 4 },

  // Variations
  section: { marginTop: 20 },
  optionSection: { marginTop: 8, marginHorizontal: Spacing.base },
  selectedOptionSummary: { marginHorizontal: Spacing.base, marginTop: 4, marginBottom: 4, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  selectedOptionSku: { fontSize: FontSizes.xs, color: Colors.textMuted },
  availabilityText: { marginTop: 6, fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: "700" },
  sectionTitle: { fontSize: FontSizes.base, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  variationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectedVariationLabel: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: "600", backgroundColor: Colors.pinkSoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full },
  variationErrorText: { fontSize: FontSizes.xs, color: "#e53e3e", fontWeight: "500", marginBottom: 8 },
  variations: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variationChip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.xl, backgroundColor: Colors.surface, overflow: "hidden" },
  variationChipActive: { borderColor: Colors.primary, backgroundColor: Colors.pinkSoft },
  variationChipUnavailable: { opacity: 0.4 },
  variationChipError: { borderColor: "#e53e3e" },
  variationWithImage: { width: 96, alignItems: "center", padding: 6 },
  variationThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: "#fff" },
  variationText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: "500", textAlign: "center", paddingHorizontal: 6, paddingVertical: 8 },
  variationTextActive: { color: Colors.primary, fontWeight: "700" },
  variationTextUnavailable: { color: Colors.textLight },
  strikeThrough: { position: "absolute", left: 0, right: 0, top: "50%", height: 1.5, backgroundColor: Colors.textMuted },
  variationHint: { marginTop: 8, fontSize: FontSizes.xs, color: Colors.textMuted, fontStyle: "italic" },

  // Quantity
  qtyBox: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.xl, padding: 12, backgroundColor: "rgba(255,255,255,0.8)" },
  qtyBoxLabel: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.5, color: Colors.textMuted },
  qtyBoxSub: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  qtyControls: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, overflow: "hidden", backgroundColor: "#fff" },
  qtyBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 22, fontWeight: "900", color: Colors.primary },
  qtyText: { fontSize: FontSizes.base, fontWeight: "900", color: Colors.textPrimary, minWidth: 40, textAlign: "center" },

  // Card sections
  cardSection: { paddingHorizontal: Spacing.base, marginTop: 24 },
  sectionLabel: { fontSize: 11, fontWeight: "900", color: Colors.primary, letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 10 },
  card: { backgroundColor: Colors.surface, borderRadius: 30, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border, ...Shadows.sm },
  bodyText: { fontSize: FontSizes.base, color: Colors.textSecondary, lineHeight: 24 },

  // Descrição + Benefícios
  benefitsSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  benefitsTitle: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary, marginBottom: 8 },

  // Características grid
  caracterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  caracterCard: {
    width: (SCREEN_WIDTH - Spacing.base * 2 - Spacing.base * 2 - 10) / 2,
    borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.pinkPale, padding: 14,
  },
  caracterLabel: { fontSize: 11, fontWeight: "900", color: Colors.primary, textTransform: "uppercase", letterSpacing: 1 },
  caracterValue: { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.textPrimary, marginTop: 4, lineHeight: 18 },

  // Modo de uso
  cuidadosCard: {
    borderRadius: BorderRadius.xl,
    padding: 20,
    backgroundColor: "#17070C",

  },
  cuidadosSmallLabel: { fontSize: 10, fontWeight: "900", color: "rgba(255,200,220,0.9)", letterSpacing: 1.8, textTransform: "uppercase" },
  cuidadosTitle: { fontSize: FontSizes.lg, fontWeight: "900", color: "#fff", marginTop: 4, marginBottom: 16 },
  cuidadosItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cuidadosNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cuidadosNumberText: { color: "rgba(255,200,220,0.9)", fontWeight: "900", fontSize: FontSizes.xs },
  cuidadosText: { flex: 1, fontSize: FontSizes.sm, color: "rgba(255,255,255,0.8)", lineHeight: 20 },
  usageCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.xl, padding: 14 },
  usageCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  usageCardNumber: { width: 40, height: 40, borderRadius: BorderRadius.lg, backgroundColor: Colors.pinkPale, alignItems: "center", justifyContent: "center" },
  usageCardNumberText: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.primary },
  usageCardTitle: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary },

  // Reviews
  reviewSummary: { flexDirection: "row", alignItems: "center", borderRadius: BorderRadius.xl, backgroundColor: Colors.pinkPale, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  reviewSummaryLeft: { alignItems: "flex-start", gap: 4 },
  reviewBigNumber: { fontSize: 56, fontWeight: "900", color: Colors.textPrimary, lineHeight: 60 },
  reviewSummaryCount: { fontSize: FontSizes.sm, fontWeight: "600", color: Colors.textMuted, marginTop: 4 },
  reviewCard: { borderRadius: 26, borderWidth: 1, borderColor: Colors.border, padding: 16, backgroundColor: Colors.surface },
  reviewCardDark: { backgroundColor: "#17070C", borderColor: "rgba(23,7,12,0.1)" },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 44, height: 44, borderRadius: BorderRadius.lg, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  reviewAvatarText: { color: "#fff", fontWeight: "900", fontSize: FontSizes.sm },
  reviewName: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary, marginBottom: 2 },
  reviewDate: { fontSize: FontSizes.xs, color: Colors.textMuted },
  reviewText: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },

  // FAQ
  faqItem: { borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, overflow: "hidden", backgroundColor: Colors.pinkPale },
  faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 16 },
  faqQuestion: { flex: 1, fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary },
  faqAnswer: { borderTopWidth: 1, borderTopColor: Colors.border, padding: 16, paddingTop: 12 },
  faqAnswerText: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 22 },

  // Related
  relatedBadge: { fontSize: 11, fontWeight: "900", color: Colors.primary, letterSpacing: 1.8, marginBottom: 4, textTransform: "uppercase" },
  relatedTitleRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 },
  relatedTitle: { fontSize: FontSizes.lg, fontWeight: "900", color: Colors.textPrimary },
  relatedLink: { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.primary },
  relatedGrid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP },
  relatedItem: { width: RELATED_CARD_WIDTH },

  // Benefits strip
  benefitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  benefitCard: {
    width: (SCREEN_WIDTH - Spacing.base * 2 - 10) / 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: "rgba(255,79,135,0.2)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 16, alignItems: "center",
  },
  benefitIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,79,135,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  benefitTitle: { fontSize: FontSizes.sm, fontWeight: "900", color: Colors.textPrimary, textAlign: "center" },
  benefitSubtitle: { fontSize: FontSizes.xs, color: Colors.textMuted, textAlign: "center", marginTop: 2 },

  // Contact card
  contactCard: { borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: "rgba(255,79,135,0.35)", backgroundColor: "#1b0710", padding: 20 },
  contactTop: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 },
  contactIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  contactTitle: { fontSize: FontSizes.base, fontWeight: "900", color: "#fff", marginBottom: 6 },
  contactHours: { fontSize: FontSizes.sm, color: "rgba(255,255,255,0.62)", lineHeight: 20 },

  // Payment
  paymentRow: { gap: 10, paddingBottom: 4 },
  paymentCard: { height: 54, minWidth: 110, borderRadius: BorderRadius.lg, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderWidth: 1, borderColor: Colors.border },
  paymentMark: { fontSize: FontSizes.base, fontWeight: "900" },

  // Feito com amor
  feitoWrap: { alignItems: "center", paddingVertical: 32, gap: 6 },
  feitoTitle: { fontSize: FontSizes.xl, fontWeight: "900", color: Colors.textPrimary, fontStyle: "italic" },
  feitoSub: { fontSize: FontSizes.sm, color: Colors.textMuted },

  // Footer
  footer: { gap: 10, padding: Spacing.base, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  footerPrice: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerActions: { flexDirection: "row", gap: 10 },
  footerPriceLabel: { fontSize: FontSizes.xs, color: Colors.textMuted },
  footerPriceValue: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.primary },
});
