import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  useWindowDimensions,
  Alert,
  Text as NativeText,
  type TextProps,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import * as WebBrowser from "expo-web-browser";
import { categoryArtwork, instagramProfile, instagramStoriesUrl, thumbnail } from "@/components/home/brand";
import { SeasonalAudioControl } from "@/components/home/SeasonalAudioControl";
import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ProductCard } from "@/components/product/ProductCard";
import { Colors, BorderRadius, Shadows } from "@/constants/theme";
import { favoritesApi, homeApi, storeLikesApi } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import type {
  HomeBanner,
  HomeCategory,
  HomeProductSection,
  HomeQuickCategory,
  HomeStory,
  HomeStoryItem,
  MobileHomePayload,
} from "@/types/home";

const SITE = process.env.EXPO_PUBLIC_API_URL ?? "https://kabijoux.com.br";
const CACHE_KEY = "ka-mobile-home-v3";
const STORE_LOVE_VISITOR_KEY = "ka-store-love-visitor-v1";
const HIDDEN_HOME_STORY_SHORTCUTS = new Set([
  "story-novidades",
  "story-promocoes",
  "story-lancamentos",
  "story-ofertas",
]);
function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: 'Inter' }, style]} />;
}

function resolveUrl(value?: string | null): string | null;
function resolveUrl(value?: number | ImageSource | null): number | ImageSource | null;
function resolveUrl(value?: string | number | ImageSource | null): string | number | ImageSource | null;
function resolveUrl(value?: string | number | ImageSource | null) {
  if (!value) return null;
  if (typeof value !== "string") return value;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE}${value.startsWith("/") ? value : `/${value}`}`;
}

async function openInstagram() {
  try {
    // The Stories universal link opens Instagram when installed, otherwise the browser.
    await Linking.openURL(instagramStoriesUrl);
  } catch {
    try {
      await WebBrowser.openBrowserAsync(instagramStoriesUrl).catch(() => Linking.openURL(instagramProfile));
    } catch {
      Alert.alert("Instagram", "Não foi possível abrir o Instagram. Tente novamente.");
    }
  }
}

function isSafeStoreHref(value: string | null | undefined, allowedCategorySlugs: Set<string>) {
  if (!value) return false;
  try {
    const parsed = new URL(value, SITE);
    const pathname = parsed.pathname;
    if (pathname.startsWith("/(tabs)/")) return true;
    if (pathname === "/produtos") {
      const category = parsed.searchParams.get("category") ?? parsed.searchParams.get("cat");
      return !category || allowedCategorySlugs.has(category);
    }
    if (pathname.startsWith("/produto/")) return true;
    if (pathname.startsWith("/categoria/")) {
      const slug = pathname.split("/")[2];
      return Boolean(slug && allowedCategorySlugs.has(slug));
    }
  } catch {
    return false;
  }
  return false;
}

function toMobileRoute(href: string) {
  if (href.startsWith("/categoria/")) {
    const [path, search] = href.split("?", 2);
    const [, , category, subcategory] = path.split("/");
    const params = new URLSearchParams(search);
    if (category) params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    return `/produtos?${params.toString()}`;
  }
  return href;
}

function isHomePayload(value: unknown): value is MobileHomePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<MobileHomePayload>;
  return (
    payload.schemaVersion === 2 &&
    Array.isArray(payload.banners) &&
    Array.isArray(payload.stories) &&
    Array.isArray(payload.categories) &&
    Array.isArray(payload.sections) &&
    Boolean(payload.finalCta)
  );
}

function Header({ itemCount, favoriteCount, theme, onNavigate }: {
  itemCount: number;
  favoriteCount: number;
  theme?: MobileHomePayload["theme"];
  onNavigate: (href: string) => void;
}) {
  const openSearch = () => onNavigate("/(tabs)/busca");
  const headerColors = theme?.seasonalDecoration
    ? ["#700019", "#700019"] as const
    : theme?.headerColors ?? ["#7a002e", "#51001f"];
  const logo = theme?.seasonalDecoration
    ? theme.logoUrl && theme.logoUrl !== "/images/brand/ka-bijoux-logo-natal.png"
      ? resolveUrl(theme.logoUrl)
      : require("../../assets/brand/ka-bijoux-logo-natal.png")
    : theme?.logoUrl
      ? resolveUrl(theme.logoUrl)
      : null;
  return (
    <LinearGradient colors={[headerColors[0], theme?.seasonalDecoration ? "#880020" : "#a60043", headerColors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
      <View style={[styles.headerTopRow, theme?.seasonalDecoration && styles.headerTopRowSeasonal]}>
        <TouchableOpacity style={[styles.headerButton, styles.headerSideAction]} accessibilityLabel="Abrir categorias" onPress={() => onNavigate("/(tabs)/categorias")}>
          <Ionicons name="menu-outline" size={27} color="#fff" />
        </TouchableOpacity>
        <View pointerEvents="none" style={styles.wordmark} accessibilityLabel="KA Bijoux">
          {logo ? <Image source={logo} style={styles.seasonalLogo} contentFit="contain" cachePolicy="memory-disk" accessibilityLabel="Logomarca natalina KA Bijoux" /> : <>
            <Text style={styles.wordmarkKa}>KA</Text><Text style={styles.wordmarkBijoux}>Bijoux</Text>
          </>}
        </View>
        <View style={[styles.headerActions, styles.headerSideAction]}>
          <TouchableOpacity style={styles.headerButton} accessibilityLabel="Pesquisar produtos" onPress={openSearch}>
            <Ionicons name="search-outline" size={23} color="#fff" />
          </TouchableOpacity>
          {theme?.seasonalDecoration ? <SeasonalAudioControl available={theme.ambientMusic?.enabled === true} url={theme.ambientMusic?.url} volume={theme.ambientMusic?.volume} /> : null}
        <TouchableOpacity style={styles.headerButton} accessibilityLabel="Abrir favoritos" onPress={() => onNavigate("/favoritos")}>
            <Ionicons name="heart-outline" size={23} color="#fff" />
            {favoriteCount > 0 ? <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{Math.min(favoriteCount, 99)}</Text></View> : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} accessibilityLabel="Abrir carrinho" onPress={() => onNavigate("/(tabs)/carrinho")}>
            <Ionicons name="cart-outline" size={23} color="#fff" />
            {itemCount > 0 ? <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{Math.min(itemCount, 99)}</Text></View> : null}
        </TouchableOpacity>
        </View>
      </View>
      <View style={styles.searchShell}>
        <Ionicons name="search-outline" size={19} color="#6f5962" />
        <TextInput editable={false} onPressIn={openSearch} returnKeyType="search"
          placeholder="Buscar produtos, categorias e mais..." placeholderTextColor="#806d75" style={styles.searchInput}
          accessibilityLabel="Buscar produtos, categorias e mais" />
      </View>
    </LinearGradient>
  );
}

function StoreLoveButton() {
  const customer = useAuthStore((state) => state.customer);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [saving, setSaving] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const countLabel = count === null
    ? "Carregando…"
    : count === 1
      ? "1 pessoa ama a KA"
      : `${new Intl.NumberFormat("pt-BR").format(count)} pessoas amam a KA`;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        let id = await AsyncStorage.getItem(STORE_LOVE_VISITOR_KEY);
        if (!id) {
          id = Crypto.randomUUID();
          await AsyncStorage.setItem(STORE_LOVE_VISITOR_KEY, id);
        }
        if (!active) return;
        setVisitorId(id);
        const response = await storeLikesApi.get(id);
        if (active) {
          setCount(response.data.data.count);
          setLiked(response.data.data.liked);
        }
      } catch {
        if (active) setCount(null);
      }
    })();
    return () => { active = false; };
  }, [customer?.id]);

  const toggle = async () => {
    if (!visitorId || count === null || saving) return;
    const previous = { liked, count };
    const next = !liked;
    setSaving(true);
    setLiked(next);
    setCount(Math.max(0, count + (next ? 1 : -1)));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, speed: 34 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 28 }),
    ]).start();
    try {
      const response = await storeLikesApi.set(visitorId, next);
      setCount(response.data.data.count);
      setLiked(response.data.data.liked);
    } catch {
      setLiked(previous.liked);
      setCount(previous.count);
      Alert.alert("Amor pela KA", "Não foi possível salvar sua curtida. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TouchableOpacity onPress={() => void toggle()} disabled={!visitorId || count === null || saving}
      accessibilityRole="button" accessibilityState={{ selected: liked, disabled: saving || count === null }}
      accessibilityLabel={liked ? `Amor enviado! ${countLabel}. Toque para retirar a curtida.` : `Deixe seu amor. ${countLabel}.`}
      style={styles.storeLove}>
      <Animated.View style={styles.storeLoveHeartWrap}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={25} color={Colors.primary} />
        </Animated.View>
      </Animated.View>
      <View style={styles.storeLoveCopy}>
        <Text numberOfLines={1} style={styles.storeLoveLabel}>{liked ? "Amor enviado!" : "Deixe seu amor"}</Text>
        <Text numberOfLines={1} style={styles.storeLoveCountText}>{countLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

function HeroCarousel({ banners, onNavigate }: { banners: HomeBanner[]; onNavigate: (href: string) => void }) {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.max(0, windowWidth - 24);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<FlatList<HomeBanner>>(null);
  const physicalIndex = useRef(banners.length > 1 ? 1 : 0);
  const interacting = useRef(false);
  const carouselItems = useMemo(
    () => banners.length > 1 ? [banners[banners.length - 1], ...banners, banners[0]] : banners,
    [banners],
  );

  useEffect(() => {
    physicalIndex.current = banners.length > 1 ? 1 : 0;
    setActiveIndex(0);
    requestAnimationFrame(() => carouselRef.current?.scrollToIndex({ index: physicalIndex.current, animated: false }));
  }, [banners, width]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => {
      if (interacting.current) return;
      const nextPhysicalIndex = physicalIndex.current + 1;
      const firstSource = resolveUrl(banners[0].mobileImage || banners[0].image);
      if (physicalIndex.current === banners.length && typeof firstSource === "string") {
        void Image.prefetch(firstSource, "memory-disk");
      }
      carouselRef.current?.scrollToIndex({ index: nextPhysicalIndex, animated: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  const settleAt = useCallback((nextPhysicalIndex: number) => {
    if (banners.length < 2) {
      setActiveIndex(0);
      return;
    }
    physicalIndex.current = nextPhysicalIndex;
    if (nextPhysicalIndex === 0) {
      setActiveIndex(banners.length - 1);
      physicalIndex.current = banners.length;
      requestAnimationFrame(() => carouselRef.current?.scrollToIndex({ index: banners.length, animated: false }));
      return;
    }
    if (nextPhysicalIndex === banners.length + 1) {
      setActiveIndex(0);
      physicalIndex.current = 1;
      requestAnimationFrame(() => carouselRef.current?.scrollToIndex({ index: 1, animated: false }));
      return;
    }
    setActiveIndex(nextPhysicalIndex - 1);
  }, [banners.length]);

  if (!banners.length) return null;
  return (
    <LinearGradient colors={["#700019", "#a00029", "#dc365e", "#fff7f9"]} locations={[0, 0.48, 0.77, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.heroWrap}>
      <FlatList
        ref={carouselRef}
        data={carouselItems}
        style={[styles.heroCarousel, { width }]}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={banners.length > 1 ? 1 : 0}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={3}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        keyExtractor={(banner, index) => `${banner.id}-${index}`}
        onScrollBeginDrag={() => { interacting.current = true; }}
        onScrollEndDrag={() => { interacting.current = false; }}
        onMomentumScrollEnd={(event) => {
          interacting.current = false;
          settleAt(Math.round(event.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item: banner, index }) => (
          <TouchableOpacity
            style={[styles.heroSlide, { width }]}
            accessibilityLabel={`${banner.title}. ${banner.cta}`}
            activeOpacity={0.94}
            onPress={() => onNavigate(banner.href)}
          >
            <Image
              source={resolveUrl(banner.mobileImage || banner.image)}
              style={[StyleSheet.absoluteFill, styles.heroBackdropImage]}
              contentFit="cover"
              blurRadius={18}
              cachePolicy="memory-disk"
              priority={index <= 2 ? "high" : "normal"}
            />
            <Image
              source={resolveUrl(banner.mobileImage || banner.image)}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              cachePolicy="memory-disk"
              priority={index <= 2 ? "high" : "normal"}
              transition={180}
            />
          </TouchableOpacity>
        )}
      />
      <View style={styles.dots}>
        {banners.map((banner, index) => (
          <View key={banner.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </LinearGradient>
  );
}

function StoryViewer({ story, onClose, onNavigate }: {
  story: HomeStory | null;
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const [itemIndex, setItemIndex] = useState(0);
  const item = story?.items[itemIndex] ?? null;
  const videoSource = item?.type === "video" ? resolveUrl(item.src || item.mediaUrl) : null;
  const player = useVideoPlayer(videoSource, (instance) => {
    instance.loop = false;
    instance.play();
  });

  useEffect(() => setItemIndex(0), [story?.id]);

  const goNext = () => {
    if (!story) return;
    if (itemIndex + 1 >= story.items.length) onClose();
    else setItemIndex((current) => current + 1);
  };

  return (
    <Modal visible={Boolean(story)} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.storyModal}>
        <SafeAreaView style={styles.storySafe}>
          <View style={styles.storyTop}>
            <Text style={styles.storyModalTitle} numberOfLines={1}>{story?.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.storyClose}>
              <Ionicons name="close" size={25} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.storyProgress}>
            {story?.items.map((storyItem, index) => (
              <View key={storyItem.id} style={[styles.storyProgressBar, index <= itemIndex && styles.storyProgressActive]} />
            ))}
          </View>
          <View style={styles.storyMedia}>
            {item?.type === "video" ? (
              <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />
            ) : item ? (
              <>
                <Image
                  source={resolveUrl(item.src || item.mediaUrl)}
                  style={[StyleSheet.absoluteFill, styles.storyMediaBackground]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={[StyleSheet.absoluteFill, styles.storyMediaShade]} />
                <Image
                  source={resolveUrl(item.src || item.mediaUrl)}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  transition={140}
                />
              </>
            ) : (
              <View style={styles.storyUnavailable}>
                <Ionicons name="image-outline" size={42} color="#fff" />
                <Text style={styles.storyUnavailableText}>Story indisponível.</Text>
              </View>
            )}
          </View>
          {item?.text ? <Text style={styles.storyText}>{item.text}</Text> : null}
          {story?.review ? <View style={styles.storyReviewCard}>
            <Text style={styles.storyReviewStars}>{"★".repeat(story.review.rating)}{"☆".repeat(5 - story.review.rating)}</Text>
            {story.review.comment ? <Text style={styles.storyReviewQuote}>“{story.review.comment}”</Text> : null}
            <Text style={styles.storyReviewByline}>{story.review.customerName} · Compra verificada · {story.review.productName}</Text>
          </View> : null}
          <View style={styles.storyActions}>
            {itemIndex > 0 ? (
              <TouchableOpacity style={styles.storyNavButton} onPress={() => setItemIndex((current) => current - 1)}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
                <Text style={styles.storyNavText}>Anterior</Text>
              </TouchableOpacity>
            ) : <View />}
            {item?.link || item?.linkUrl ? (
              <TouchableOpacity
                style={styles.storyLinkButton}
                onPress={() => {
                  const href = item?.link || item?.linkUrl;
                  if (href) onNavigate(href);
                  onClose();
                }}
              >
                <Text style={styles.storyLinkText}>{item?.buttonText || "Ver produtos"}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.storyNavButton} onPress={goNext}>
              <Text style={styles.storyNavText}>{story && itemIndex + 1 >= story.items.length ? "Fechar" : "Próximo"}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const STORY_CATEGORIES = [
  { key: "OFFICIAL", label: "KA Stories", icon: "storefront-outline" as const },
  { key: "CUSTOMER", label: "Clientes", icon: "people-outline" as const },
  { key: "REVIEW", label: "Avaliações", icon: "star-outline" as const },
  { key: "HIGHLIGHT", label: "Destaques", icon: "sparkles-outline" as const },
] as const;

function Stories({ stories, logoUrl, onOpen }: { stories: HomeStory[]; logoUrl?: string; onOpen: (story: HomeStory) => void }) {
  const [emptyCategory, setEmptyCategory] = useState<string | null>(null);
  const openCategory = (category: typeof STORY_CATEGORIES[number]) => {
    const groups = stories.filter((story) => (story.category ?? "OFFICIAL") === category.key && !HIDDEN_HOME_STORY_SHORTCUTS.has(story.id));
    const items = groups.flatMap((group) => group.items);
    if (!items.length) {
      setEmptyCategory(category.label);
      return;
    }
    onOpen({ ...groups[0], id: `story-category-${category.key}`, title: category.label, items });
  };

  return <View style={styles.storiesSection}>
    <View style={styles.storyHeadingRow}>
      <View style={styles.storyHeadingGroup}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.storyHeading}>Stories da</Text>
        <Text numberOfLines={1} style={styles.storyHeadingKa}>KA</Text>
      </View>
      <StoreLoveButton />
    </View>
    <View style={styles.storyList}>
      {STORY_CATEGORIES.map((category) => {
        const group = stories.find((story) => (story.category ?? "OFFICIAL") === category.key && story.items.length > 0);
        const cover = group?.cover || group?.coverImageUrl;
        return <TouchableOpacity key={category.key} style={styles.storyItem}
          onPress={() => category.key === "OFFICIAL" ? void openInstagram() : openCategory(category)}
          accessibilityLabel={category.key === "OFFICIAL" ? "Abrir KA Stories no Instagram oficial" : `Abrir ${category.label}`}>
          <LinearGradient colors={["#ffc34d", "#ff7a37", "#ff0050", "#cc003d"]} locations={[0, 0.34, 0.68, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.storyRing}>
            <View style={styles.storyInner}>
              {cover ? <Image source={thumbnail(resolveUrl(cover), 256)} style={styles.storyCover} contentFit="cover" cachePolicy="memory-disk" />
                : category.key === "OFFICIAL" ? <Image source={logoUrl === "/images/brand/ka-bijoux-logo-natal-story.png" ? require("../../assets/brand/ka-bijoux-logo-natal-story.png") : logoUrl ? resolveUrl(logoUrl) : resolveUrl('/images/brand/ka-bijoux-logo-story-icon.png')} style={styles.storyCover} contentFit="contain" cachePolicy="memory-disk" />
                : <Ionicons name={category.icon} size={28} color={Colors.primary} style={styles.storyEmptyIcon} />}
            </View>
          </LinearGradient>
          <Text style={styles.storyLabel}>{category.label}</Text>
        </TouchableOpacity>;
      })}
    </View>
    <Modal transparent visible={Boolean(emptyCategory)} animationType="fade" onRequestClose={() => setEmptyCategory(null)}>
      <View style={styles.emptyStoryBackdrop}>
        <View style={styles.emptyStoryCard}>
          <TouchableOpacity style={styles.emptyStoryClose} onPress={() => setEmptyCategory(null)} accessibilityLabel="Fechar">
            <Ionicons name="close" size={21} color={Colors.primary} />
          </TouchableOpacity>
          <Image source={logoUrl === "/images/brand/ka-bijoux-logo-natal-story.png" ? require("../../assets/brand/ka-bijoux-logo-natal-story.png") : logoUrl ? resolveUrl(logoUrl) : resolveUrl('/images/brand/ka-bijoux-logo-story-icon.png')} style={styles.emptyStoryLogo} contentFit="contain" />
          <Text style={styles.emptyStoryTitle}>{emptyCategory}</Text>
          <Text style={styles.emptyStoryText}>Ainda não há conteúdo publicado nesta seção. Volte em breve para conferir as novidades da KA Bijoux.</Text>
        </View>
      </View>
    </Modal>
  </View>;
}

function QuickCategories({ categories, onNavigate }: { categories: HomeQuickCategory[]; onNavigate: (href: string) => void }) {
  if (!categories.length) return null;
  const icons: Record<HomeQuickCategory["icon"], keyof typeof Ionicons.glyphMap> = {
    sparkles: "sparkles-outline", tag: "pricetag-outline", new: "flash-outline",
    diamond: "diamond-outline", phone: "phone-portrait-outline", grid: "grid-outline",
  };
  return <View style={styles.quickSection}>
    <ScrollView horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
      {categories.map((category, index) => <TouchableOpacity key={category.href} style={[styles.quickCard, index < categories.length - 1 && styles.quickCardDivider]}
        accessibilityLabel={`Abrir categoria ${category.label}. ${category.description}`} onPress={() => onNavigate(category.href)}>
        <Ionicons name={icons[category.icon]} size={19} color={Colors.primary} />
        <Text numberOfLines={1} style={styles.quickTitle}>{category.label === "Ver categorias" ? "Categorias" : category.label}</Text>
      </TouchableOpacity>)}
    </ScrollView>
  </View>;
}

function SpecialArea({ category, onNavigate }: { category?: HomeCategory; onNavigate: (href: string) => void }) {
  if (!category) return null;
  return <TouchableOpacity style={styles.specialArea} onPress={() => onNavigate(`/categoria/${category.slug}`)} accessibilityLabel="Entrar no Sex Shop">
    <LinearGradient colors={['#40051d', '#b20f4e', '#ff4f87', '#4b0521']} style={styles.specialInner}>
      <Image source={categoryArtwork.heart} style={{ width: 56, height: 56 }} />
      <View style={{ flex: 1 }}><Text style={styles.specialLabel}>ÁREA ESPECIAL</Text>
        <Text style={styles.specialTitle}>Entrar no Sex Shop</Text>
        <Text style={styles.specialSubtitle}>{category.description || 'Lingerie e produtos especiais'}</Text>
      </View><Ionicons name="chevron-forward" size={20} color="#fff" />
    </LinearGradient>
  </TouchableOpacity>;
}

function ProductSection({ section, onNavigate, favoriteIds, onFavoriteToggle }: {
  section: HomeProductSection;
  onNavigate: (href: string) => void;
  favoriteIds: Record<string, string>;
  onFavoriteToggle: (productId: string) => void;
}) {
  const { width } = useWindowDimensions();
  if (!section.products.length) return null;
  const gridGap = 8;
  const cardWidth = Math.max(0, (width - 16 - gridGap) / 2);
  return (
    <View style={[styles.productSection, section.background === "subtle" && styles.productSectionSubtle]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          {section.label && section.id !== "achadinhos" ? <Text style={styles.eyebrow}>{section.label.toUpperCase()}</Text> : null}
          <Text style={styles.productSectionTitle}>{section.title}</Text>
          {section.subtitle ? <Text style={styles.productSectionSubtitle}>{section.subtitle}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => onNavigate(section.route)}><Text style={styles.more}>Ver mais →</Text></TouchableOpacity>
      </View>
      <View style={styles.productGrid}>
        {section.products.map((product) => (
          <View key={product.id} style={[styles.productCell, { width: cardWidth }]}><ProductCard product={{ ...product, badge: null }} badgeSeal={false} compact showFavorite
            isFavorite={Boolean(favoriteIds[product.id])} onFavoriteToggle={onFavoriteToggle} /></View>
        ))}
      </View>
      <TouchableOpacity style={styles.allButton} onPress={() => onNavigate(section.route)}>
        <Text style={styles.allButtonText}>{section.moreLabel} →</Text>
      </TouchableOpacity>
    </View>
  );
}

function Benefits({ benefits }: { benefits: MobileHomePayload["benefits"] }) {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    gift: "gift-outline",
    card: "card-outline",
    shield: "shield-checkmark-outline",
  };
  return (
    <View style={styles.benefits}>
      {benefits.map((benefit) => (
        <View key={benefit.title} style={styles.benefitItem}>
          <Ionicons name={icons[benefit.icon] ?? "checkmark-circle-outline"} size={22} color={Colors.primary} />
          <View style={styles.benefitCopy}><Text style={styles.benefitTitle}>{benefit.title}</Text><Text style={styles.benefitSubtitle}>{benefit.subtitle}</Text></View>
        </View>
      ))}
    </View>
  );
}

function FinalCta({ cta, onNavigate }: { cta: MobileHomePayload["finalCta"]; onNavigate: (href: string) => void }) {
  return (
    <LinearGradient colors={["#1A0A0F", "#2D0A18", "#1A0A0F"]} style={styles.finalCta}>
      <Text style={styles.finalCtaLabel}>{cta.label.toUpperCase()}</Text>
      <Text style={styles.finalCtaTitle}>{cta.titlePrefix}</Text>
      <Text style={styles.finalCtaHighlight}>{cta.titleHighlight}</Text>
      <Text style={styles.finalCtaDescription}>{cta.description}</Text>
      <TouchableOpacity
        style={styles.finalCtaButton}
        onPress={() => onNavigate(cta.href)}
        accessibilityRole="button"
        accessibilityLabel="Ver coleção e novidades da KA Bijoux"
      >
        <Text style={styles.finalCtaButtonText}>{cta.button}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

function RealReviews({ reviews }: { reviews: MobileHomePayload["reviews"] }) {
  if (!reviews.length) return null;
  return (
    <View style={styles.reviews}>
      <Text style={styles.eyebrow}>AVALIAÇÕES REAIS</Text>
      <Text style={styles.sectionHeading}>O que nossas clientes dizem</Text>
      {reviews.map((review) => (
        <View key={review.id} style={styles.reviewCard}>
          <Text style={styles.reviewStars}>{"★".repeat(Math.max(1, Math.min(5, review.rating)))}</Text>
          <Text style={styles.reviewText}>“{review.comment}”</Text>
          <Text style={styles.reviewAuthor}>
            {review.customerName}{review.city ? ` • ${review.city}${review.state ? `/${review.state}` : ""}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CategoryGrid({ categories, onNavigate }: { categories: HomeCategory[]; onNavigate: (href: string) => void }) {
  if (!categories.length) return null;
  return (
    <View style={styles.categoriesSection}>
      <Text style={styles.eyebrow}>CATÁLOGO</Text>
      <Text style={styles.sectionHeading}>Todas as categorias</Text>
      <View style={styles.categoryGrid}>
        {categories.map((category) => (
          <TouchableOpacity key={category.id} style={styles.categoryCard} onPress={() => onNavigate(`/produtos?category=${category.slug}`)}>
            {category.imageUrl ? (
              <Image source={resolveUrl(category.imageUrl)} style={styles.categoryImage} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={[styles.categoryImage, styles.categoryPlaceholder]}>
                <Ionicons name="sparkles-outline" size={28} color={Colors.primary} />
              </View>
            )}
            <View style={styles.categoryCopy}>
              <Text style={styles.categoryTitle} numberOfLines={2}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.mobileProductCount} produtos</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function HomeSkeleton() {
  const { width } = useWindowDimensions();
  const gap = 8;
  const cardWidth = Math.max(0, (width - 16 - gap) / 2);
  return (
    <View style={styles.skeletonWrap}>
      <View style={[styles.skeleton, styles.skeletonHero]} />
      <View style={styles.skeletonRow}>
        {[0, 1, 2, 3].map((item) => <View key={item} style={[styles.skeleton, styles.skeletonCircle]} />)}
      </View>
      <View style={[styles.skeleton, styles.skeletonTitle]} />
      <View style={styles.productGrid}>
        {[0, 1].map((item) => <View key={item} style={[styles.skeleton, styles.skeletonProduct, { width: cardWidth }]} />)}
      </View>
    </View>
  );
}

type HomeBlock =
  | { key: "special"; type: "special"; category?: HomeCategory }
  | { key: "hero"; type: "hero"; banners: HomeBanner[] }
  | { key: "stories"; type: "stories"; stories: HomeStory[]; logoUrl?: string }
  | { key: "quick"; type: "quick"; categories: HomeQuickCategory[] }
  | { key: string; type: "products"; section: HomeProductSection }
  | { key: "benefits"; type: "benefits"; benefits: MobileHomePayload["benefits"] }
  | { key: "reviews"; type: "reviews"; reviews: MobileHomePayload["reviews"] }
  | { key: "final"; type: "final"; cta: MobileHomePayload["finalCta"] };

const HomeBlockView = memo(function HomeBlockView({ block, onNavigate, onOpenStory, favoriteIds, onFavoriteToggle }: {
  block: HomeBlock;
  onNavigate: (href: string) => void;
  onOpenStory: (story: HomeStory) => void;
  favoriteIds: Record<string, string>;
  onFavoriteToggle: (productId: string) => void;
}) {
  switch (block.type) {
    case "special": return <SpecialArea category={block.category} onNavigate={onNavigate} />;
    case "hero": return <HeroCarousel banners={block.banners} onNavigate={onNavigate} />;
    case "stories": return <Stories stories={block.stories} logoUrl={block.logoUrl} onOpen={onOpenStory} />;
    case "quick": return <QuickCategories categories={block.categories} onNavigate={onNavigate} />;
    case "products": return <ProductSection section={block.section} onNavigate={onNavigate} favoriteIds={favoriteIds} onFavoriteToggle={onFavoriteToggle} />;
    case "benefits": return <Benefits benefits={block.benefits} />;
    case "reviews": return <RealReviews reviews={block.reviews} />;
    case "final": return <FinalCta cta={block.cta} onNavigate={onNavigate} />;
  }
});

export default function HomeScreen() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay: require('../../assets/fonts/PlayfairDisplay-Bold.ttf'),
    Inter: require('../../assets/fonts/Inter-Regular.ttf'),
  });
  const customer = useAuthStore((state) => state.customer);
  const itemCount = useCartStore((state) => state.itemCount);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const [home, setHome] = useState<MobileHomePayload | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Record<string, string>>({});
  const [selectedStory, setSelectedStory] = useState<HomeStory | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeController = useRef<AbortController | null>(null);
  const hasHomeContent = useRef(false);
  const favoriteLocks = useRef(new Set<string>());
  const allowedCategorySlugs = useMemo(
    () => new Set(home?.categories.map((category) => category.slug) ?? []),
    [home?.categories]
  );

  const navigate = useCallback((href: string) => {
    if (!isSafeStoreHref(href, allowedCategorySlugs)) return;
    if (/^https?:\/\//i.test(href)) {
      const parsed = new URL(href);
      if (parsed.hostname === "kabijoux.com.br" || parsed.hostname.endsWith(".kabijoux.com.br")) {
        router.push(toMobileRoute(`${parsed.pathname}${parsed.search}`) as never);
      } else {
        Linking.openURL(href);
      }
      return;
    }
    router.push(toMobileRoute(href) as never);
  }, [allowedCategorySlugs, router]);

  useFocusEffect(useCallback(() => {
    let active = true;
    setFavoriteIds({});
    if (!customer) return () => { active = false; };
    void favoritesApi.list().then((response) => {
      if (!active) return;
      const rows = response.data?.data ?? [];
      const next: Record<string, string> = {};
      for (const row of rows) {
        if (typeof row?.id === "string" && typeof row?.favoriteId === "string") next[row.id] = row.favoriteId;
      }
      setFavoriteIds(next);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [customer]));

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!customer) {
      router.push("/(auth)/entrada");
      return;
    }
    if (favoriteLocks.current.has(productId)) return;
    favoriteLocks.current.add(productId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const existingId = favoriteIds[productId];
    if (existingId) {
      setFavoriteIds((current) => { const next = { ...current }; delete next[productId]; return next; });
      try { await favoritesApi.remove(existingId); }
      catch { setFavoriteIds((current) => ({ ...current, [productId]: existingId })); Alert.alert("Favoritos", "Não foi possível atualizar seus favoritos."); }
    } else {
      setFavoriteIds((current) => ({ ...current, [productId]: `pending:${productId}` }));
      try {
        const response = await favoritesApi.create(productId);
        const createdId = response.data?.data?.id;
        if (typeof createdId !== "string") throw new Error("Resposta de favorito inválida");
        setFavoriteIds((current) => ({ ...current, [productId]: createdId }));
      } catch {
        setFavoriteIds((current) => { const next = { ...current }; delete next[productId]; return next; });
        Alert.alert("Favoritos", "Não foi possível salvar este favorito. Tente novamente.");
      }
    }
    favoriteLocks.current.delete(productId);
  }, [customer, favoriteIds, router]);

  const loadHome = useCallback(async (refresh = false) => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const networkRequest = (async () => {
      try {
        return await homeApi.get(controller.signal);
      } catch (firstError) {
        if (controller.signal.aborted) throw firstError;
        await new Promise((resolve) => setTimeout(resolve, 500));
        return homeApi.get(controller.signal);
      }
    })();

    if (!refresh) {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        const parsed = cached ? JSON.parse(cached) : null;
        if (isHomePayload(parsed)) {
          setHome(parsed);
          hasHomeContent.current = true;
          setLoading(false);
        }
      } catch {
        await AsyncStorage.removeItem(CACHE_KEY).catch(() => undefined);
      }
    }

    try {
      const response = await networkRequest;
      const payload = response.data?.data;
      if (!isHomePayload(payload)) throw new Error("Resposta inválida da Home");
      setHome(payload);
      hasHomeContent.current = true;
      setOffline(false);
      void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setOffline(true);
      setError(hasHomeContent.current ? "Sem conexão. Exibindo os dados salvos." : "Não foi possível carregar a loja.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadHome();
    return () => activeController.current?.abort();
  }, [loadHome]);

  useEffect(() => {
    if (customer) void fetchCart();
  }, [customer, fetchCart]);

  const homeBlocks = useMemo<HomeBlock[]>(() => {
    if (!home) return [];
    const special: HomeBlock = { key: "special", type: "special", category: home.categories.find((category) => category.slug === "sex-shop") };
    const banners = home.banners;
    const featured: HomeBlock[] = [
      { key: "hero", type: "hero", banners },
      { key: "stories", type: "stories", stories: home.stories, logoUrl: home.theme?.storyLogoUrl },
      { key: "quick", type: "quick", categories: home.quickCategories },
    ];
    const blocks: HomeBlock[] = Platform.OS === "ios" ? [...featured, special] : [special, ...featured];
    const sections = [...home.sections].sort((a, b) => Number(b.id === "achadinhos") - Number(a.id === "achadinhos"));
    sections.forEach((section) => {
      blocks.push({ key: `products-${section.id}`, type: "products", section });
    });
    blocks.push(
      { key: "reviews", type: "reviews", reviews: home.reviews },
      { key: "final", type: "final", cta: home.finalCta },
    );
    return blocks;
  }, [home]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar style="light" backgroundColor={home?.theme?.seasonalDecoration ? "#700019" : home?.theme?.headerColors?.[0] ?? "#7a002e"} />
      <Header itemCount={itemCount} favoriteCount={Object.keys(favoriteIds).length} theme={home?.theme} onNavigate={navigate} />
      {offline ? (
        <TouchableOpacity style={styles.offlineBanner} onPress={() => void loadHome(true)}>
          <Ionicons name="cloud-offline-outline" size={16} color="#7f1d1d" />
          <Text style={styles.offlineText}>{error} Toque para tentar novamente.</Text>
        </TouchableOpacity>
      ) : null}
      <FlatList
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 16 }]}
        data={home && (fontsLoaded || fontError) ? homeBlocks : []}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <HomeBlockView block={item} onNavigate={navigate} onOpenStory={setSelectedStory} favoriteIds={favoriteIds} onFavoriteToggle={toggleFavorite} />
        )}
        initialNumToRender={4}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
        windowSize={3}
        removeClippedSubviews={Platform.OS === "android"}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadHome(true)} tintColor={Colors.primary} />}
        ListEmptyComponent={loading || (home && !(fontsLoaded || fontError)) ? <HomeSkeleton /> : !home ? (
          <View style={styles.errorState}>
            <Ionicons name="cloud-offline-outline" size={48} color={Colors.primary} />
            <Text style={styles.errorTitle}>Não foi possível abrir a loja</Text>
            <Text style={styles.errorDescription}>Verifique sua internet e tente novamente.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void loadHome(true)}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      />
      {selectedStory ? <StoryViewer story={selectedStory} onClose={() => setSelectedStory(null)} onNavigate={navigate} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#700019" },
  scroll: { flex: 1 },
  scrollContent: { backgroundColor: "#fff7f9" },
  header: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 6,
    gap: 5,
    zIndex: 10,
  },
  headerTopRow: {
    minHeight: Platform.OS === "ios" ? 47 : 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  headerTopRowSeasonal: { minHeight: 72 },
  wordmark: { position: "absolute", left: 0, right: 0, top: -3, bottom: -3, flexDirection: "row", alignItems: "center", justifyContent: "center", zIndex: 0 },
  seasonalLogo: { width: 78, height: 78 },
  wordmarkKa: { color: "#fff", fontFamily: "PlayfairDisplay", fontSize: 29, fontWeight: "900", letterSpacing: -2 },
  wordmarkBijoux: { color: "#f5d277", fontFamily: "PlayfairDisplay", fontSize: 21, letterSpacing: -1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 0 },
  headerSideAction: { zIndex: 2 },
  headerButton: { width: 30, height: 36, alignItems: "center", justifyContent: "center", zIndex: 2 },
  headerBadge: { position: "absolute", right: 0, top: 1, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: "#ed145b", borderWidth: 1, borderColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  headerBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800" },
  searchShell: { minHeight: 37, maxHeight: 40, borderRadius: 22, backgroundColor: "#fff", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9, ...Shadows.sm },
  searchInput: { flex: 1, minWidth: 0, height: 38, color: "#34232a", fontFamily: "Inter", fontSize: 12, paddingVertical: 0 },
  offlineBanner: { minHeight: 38, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fee2e2", flexDirection: "row", gap: 7, alignItems: "center" },
  offlineText: { flex: 1, color: "#7f1d1d", fontSize: 11, fontWeight: "600" },
  heroWrap: { width: "100%", paddingTop: 8, paddingBottom: 24, overflow: "visible" },
  heroCarousel: { alignSelf: "center", overflow: "hidden", borderRadius: 16, ...Shadows.sm },
  heroSlide: { aspectRatio: 2.8, backgroundColor: "#a00029", borderRadius: 16, borderWidth: 1, borderColor: "#fff", overflow: "hidden" },
  heroBackdropImage: { opacity: 0.52 },
  dots: { position: "absolute", left: 0, right: 0, bottom: 28, zIndex: 4, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.82)" },
  dotActive: { width: 16, backgroundColor: "#f12b70" },
  storiesSection: { marginHorizontal: 14, marginTop: 1, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 1 },
  storyHeadingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  storyHeadingGroup: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 3 },
  storyHeading: { fontFamily: 'PlayfairDisplay', fontSize: 20, lineHeight: 25, color: '#151015', fontWeight: "700" },
  storyHeadingKa: { fontFamily: 'PlayfairDisplay', fontSize: 23, lineHeight: 26, color: Colors.primary, fontWeight: "700", fontStyle: "italic", marginLeft: 1 },
  storeLove: { minHeight: 36, maxWidth: "64%", flexShrink: 1, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: "#fceaf1", borderWidth: 1, borderColor: "#ffd3e0", ...Shadows.sm },
  storeLoveHeartWrap: { width: 25, alignItems: "center", justifyContent: "center" },
  storeLoveCopy: { flexShrink: 1, minWidth: 0, justifyContent: "center" },
  storeLoveLabel: { color: Colors.primary, fontSize: 10, lineHeight: 13, fontWeight: "800" },
  storeLoveCountText: { color: "#75495b", fontSize: 8, lineHeight: 10, fontWeight: "600", fontVariant: ["tabular-nums"] },
  eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginBottom: 4 },
  sectionHeading: { color: "#6e1430", fontSize: 23, lineHeight: 28, fontFamily: "PlayfairDisplay" },
  storyList: { paddingTop: 7, paddingBottom: 1, flexDirection: "row", justifyContent: "space-between", gap: 4 },
  storyItem: { flex: 1, minWidth: 0, alignItems: "center" },
  storyRing: { width: 64, height: 64, borderRadius: 32, padding: 3, ...Shadows.sm },
  storyInner: { flex: 1, borderRadius: 29, padding: 2, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  storyCover: { width: "100%", height: "100%", borderRadius: 27, backgroundColor: "#fff6fa" },
  storyEmptyIcon: { alignSelf: "center" },
  storyLabel: { marginTop: 4, color: "#25141b", fontSize: 10, fontWeight: "800", textAlign: "center" },
  emptyStoryBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 22, backgroundColor: "rgba(0,0,0,0.68)" },
  emptyStoryCard: { width: "100%", maxWidth: 360, borderRadius: 26, borderWidth: 1, borderColor: "#fce7f3", paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, alignItems: "center", backgroundColor: "#fff8fb", ...Shadows.md },
  emptyStoryClose: { position: "absolute", right: 12, top: 12, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  emptyStoryLogo: { width: 62, height: 62 },
  emptyStoryTitle: { color: "#7b1837", fontFamily: "PlayfairDisplay", fontWeight: "800", fontSize: 22, marginTop: 8 },
  emptyStoryText: { color: "#6b5b62", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 8 },
  storyModal: { flex: 1, backgroundColor: "rgba(9,2,5,0.98)" },
  storySafe: { flex: 1 },
  storyTop: { height: 52, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  storyModalTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "800" },
  storyClose: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  storyProgress: { flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingBottom: 8 },
  storyProgressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)" },
  storyProgressActive: { backgroundColor: Colors.primary },
  storyMedia: { flex: 1, marginHorizontal: 8, borderRadius: 18, overflow: "hidden", backgroundColor: "#14070c" },
  storyMediaBackground: { opacity: 0.36, transform: [{ scale: 1.08 }] },
  storyMediaShade: { backgroundColor: "rgba(20,7,12,0.34)" },
  storyUnavailable: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  storyUnavailableText: { color: "#fff", fontSize: 14 },
  storyText: { color: "#fff", textAlign: "center", fontSize: 15, paddingHorizontal: 18, paddingTop: 12 },
  storyReviewCard: { marginHorizontal: 14, marginTop: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.12)" },
  storyReviewStars: { color: "#f8cc64", fontSize: 13, letterSpacing: 2 },
  storyReviewQuote: { color: "#fff", fontSize: 13, lineHeight: 18, marginTop: 4 },
  storyReviewByline: { color: "#ffdbe8", fontSize: 10, marginTop: 5 },
  storyActions: { minHeight: 76, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  storyNavButton: { minWidth: 82, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  storyNavText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  storyLinkButton: { backgroundColor: Colors.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  storyLinkText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  quickSection: { marginHorizontal: 10, marginTop: 7, marginBottom: 2, paddingVertical: 5, borderRadius: 17, borderWidth: 1, borderColor: "#f7d8e2", backgroundColor: "#fff", ...Shadows.sm },
  quickRow: { width: "100%", flexGrow: 1, paddingHorizontal: 4, alignItems: "center", gap: 0 },
  quickCard: { flex: 1, minWidth: 0, height: 48, paddingHorizontal: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 },
  quickCardDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: "#e7bdcc" },
  quickTitle: { color: '#21181d', fontSize: 8.5, fontWeight: '800', textAlign: 'center', lineHeight: 10 },
  specialArea: { margin: 10, borderRadius: 28, overflow: 'hidden' },
  specialInner: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  specialLabel: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  specialTitle: { fontFamily: 'PlayfairDisplay', color: '#fff', fontSize: 24, marginVertical: 4 },
  specialSubtitle: { color: '#ffe4ef', fontSize: 12 },
  productSection: { paddingHorizontal: 8, paddingVertical: 10, backgroundColor: "#fff" },
  productSectionSubtle: { backgroundColor: Colors.pinkPale },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 8 },
  sectionHeaderCopy: { flex: 1 },
  productSectionTitle: { color: "#171217", fontSize: 20, lineHeight: 25, fontFamily: "PlayfairDisplay" },
  productSectionSubtitle: { color: "#826672", fontSize: 10, lineHeight: 14, marginTop: 2 },
  more: { color: Colors.primary, fontSize: 11, fontWeight: "800" },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "stretch" },
  productCell: { flexGrow: 0, flexShrink: 0, marginBottom: 2 },
  allButton: { alignSelf: "center", marginTop: 11, minHeight: 38, borderRadius: 20, backgroundColor: Colors.primary, paddingHorizontal: 20, maxWidth: "100%", alignItems: "center", justifyContent: "center" },
  allButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  benefits: { marginHorizontal: 10, marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-around", minHeight: 58, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: "#fce7f3", backgroundColor: "#fff8fb", ...Shadows.sm },
  benefitItem: { flex: 1, minWidth: 0, minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 4, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: "#edbad0" },
  benefitCopy: { flex: 1, minWidth: 0 },
  benefitTitle: { color: "#25131d", fontSize: 8, lineHeight: 10, fontWeight: "900" },
  benefitSubtitle: { color: "#77616b", fontSize: 7, lineHeight: 9, marginTop: 1 },
  finalCta: { paddingHorizontal: 24, paddingVertical: 72, alignItems: "center" },
  finalCtaLabel: { color: "#f472b6", fontSize: 14, fontWeight: "700", letterSpacing: 2 },
  finalCtaTitle: { marginTop: 16, color: "#fff", fontFamily: "PlayfairDisplay", fontSize: 34, lineHeight: 40, fontWeight: "800", textAlign: "center" },
  finalCtaHighlight: { color: "#fb7185", fontFamily: "PlayfairDisplay", fontSize: 34, lineHeight: 40, fontWeight: "800", textAlign: "center" },
  finalCtaDescription: { color: "#9ca3af", fontSize: 18, lineHeight: 26, textAlign: "center", marginTop: 20 },
  finalCtaButton: { marginTop: 32, minHeight: 52, borderRadius: 16, paddingHorizontal: 32, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  finalCtaButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  reviews: { padding: 16, paddingTop: 32, backgroundColor: "#fff8fb" },
  reviewCard: { marginTop: 12, borderRadius: 20, padding: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#f8d2dc", ...Shadows.sm },
  reviewStars: { color: "#f6b51b", letterSpacing: 2, fontSize: 16 },
  reviewText: { color: "#5c4550", fontSize: 13, lineHeight: 20, marginTop: 8 },
  reviewAuthor: { color: "#7b1837", fontSize: 11, fontWeight: "800", marginTop: 10 },
  categoriesSection: { padding: 16, paddingTop: 30 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 15 },
  categoryCard: { width: "48%", flexGrow: 1, flexBasis: "45%", borderRadius: 20, overflow: "hidden", backgroundColor: "#fff", borderWidth: 1, borderColor: "#f6cfda", ...Shadows.sm },
  categoryImage: { width: "100%", height: 112, backgroundColor: "#ffeaf0" },
  categoryPlaceholder: { alignItems: "center", justifyContent: "center" },
  categoryCopy: { padding: 11 },
  categoryTitle: { color: "#4c1425", fontSize: 13, fontWeight: "900", minHeight: 32 },
  categoryCount: { color: "#9b7581", fontSize: 10, marginTop: 3 },
  loadingMore: { paddingVertical: 22 },
  footer: { marginTop: 28, backgroundColor: "#17070c", paddingHorizontal: 24, paddingVertical: 34, alignItems: "center" },
  footerLogo: { color: "#ff6b91", fontSize: 28, fontWeight: "900" },
  footerText: { color: "#cab9c0", fontSize: 11, textAlign: "center", lineHeight: 17, marginTop: 8 },
  footerCopy: { color: "#806d75", fontSize: 9, marginTop: 16 },
  skeletonWrap: { paddingBottom: 20 },
  skeleton: { backgroundColor: "#f5e6eb", overflow: "hidden" },
  skeletonHero: { width: "100%", aspectRatio: 2.15, marginTop: 10 },
  skeletonRow: { flexDirection: "row", gap: 14, padding: 16 },
  skeletonCircle: { width: 64, height: 64, borderRadius: 32 },
  skeletonTitle: { width: 210, height: 26, borderRadius: 8, margin: 16 },
  skeletonProduct: { height: 190, borderRadius: 14 },
  errorState: { minHeight: 440, alignItems: "center", justifyContent: "center", padding: 28 },
  errorTitle: { color: "#4c1425", fontSize: 20, fontWeight: "900", marginTop: 14, textAlign: "center" },
  errorDescription: { color: "#826672", fontSize: 13, marginTop: 6, textAlign: "center" },
  retryButton: { marginTop: 18, minHeight: 46, borderRadius: 23, paddingHorizontal: 24, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  retryText: { color: "#fff", fontSize: 13, fontWeight: "900" },
});
