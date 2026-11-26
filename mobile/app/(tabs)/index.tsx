import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  useWindowDimensions,
  Alert,
  Text as NativeText,
  type TextProps,
  Easing,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { categoryArtwork, instagramProfile, thumbnail } from "@/components/home/brand";
import { Image, type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVideoPlayer, VideoView } from "expo-video";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ProductCard } from "@/components/product/ProductCard";
import { Colors, BorderRadius, Shadows } from "@/constants/theme";
import { homeApi } from "@/services/api";
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
const HIDDEN_HOME_STORY_SHORTCUTS = new Set([
  "story-novidades",
  "story-promocoes",
  "story-lancamentos",
  "story-clientes",
  "story-ofertas",
]);
function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[{ fontFamily: 'Inter' }, style]} />;
}

async function openInstagram(href = instagramProfile) {
  // HTTPS universal/app links open Instagram when supported, otherwise the browser.
  try { await Linking.openURL(href); }
  catch { Alert.alert('Instagram', 'Não foi possível abrir o Instagram. Tente novamente.'); }
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

function AnnouncementBar({ messages }: { messages: string[] }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [sequenceWidth, setSequenceWidth] = useState(0);
  useEffect(() => {
    if (!sequenceWidth) return;
    translateX.setValue(0);
    const animation = Animated.loop(Animated.timing(translateX, {
      toValue: -sequenceWidth, duration: sequenceWidth * 30,
      easing: Easing.linear, useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [sequenceWidth, translateX]);
  if (!messages.length) return null;
  return <LinearGradient colors={['#fff1f6', '#ffffff', '#ffe8f1']} style={styles.announcement}>
    <Animated.View style={[styles.announcementTrack, { transform: [{ translateX }] }]}>
      {[0, 1].map(copy => <View key={copy} style={styles.announcementTrack}
        accessibilityElementsHidden={copy === 1} importantForAccessibility={copy === 1 ? 'no-hide-descendants' : 'auto'}
        onLayout={copy === 0 ? event => setSequenceWidth(event.nativeEvent.layout.width) : undefined}>
        {messages.map((message, index) => <View key={index} style={styles.announcementItem}>
          <Text style={styles.announcementText}>{message}</Text><View style={styles.announcementDot} />
        </View>)}
      </View>)}
    </Animated.View>
    <LinearGradient pointerEvents="none" colors={['#fff1f6', 'rgba(255,241,246,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.announcementFade, styles.announcementFadeLeft]} />
    <LinearGradient pointerEvents="none" colors={['rgba(255,232,241,0)', '#ffe8f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.announcementFade, styles.announcementFadeRight]} />
  </LinearGradient>;
}

function Header({ itemCount, onNavigate }: { itemCount: number; onNavigate: (href: string) => void }) {
  return (
    <LinearGradient colors={["#fffafd", "#fff2f7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
      <TouchableOpacity style={styles.headerButton} accessibilityLabel="Abrir categorias" onPress={() => onNavigate("/(tabs)/categorias")}>
        <Ionicons name="menu-outline" size={27} color={Colors.primary} />
      </TouchableOpacity>
      <View style={styles.wordmark} accessibilityLabel="KA Bijoux">
        <Text style={styles.wordmarkKa}>KA</Text><Text style={styles.wordmarkBijoux}>Bijoux</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerButton} accessibilityLabel="Pesquisar produtos" onPress={() => onNavigate("/(tabs)/busca")}>
          <Ionicons name="search-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} accessibilityLabel="Abrir favoritos" onPress={() => onNavigate("/favoritos")}>
          <Ionicons name="heart-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} accessibilityLabel="Abrir carrinho" onPress={() => onNavigate("/(tabs)/carrinho")}>
          <Ionicons name="cart-outline" size={24} color={Colors.primary} />
          {itemCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{Math.min(itemCount, 99)}</Text></View> : null}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function HeroCarousel({ banners, onNavigate }: { banners: HomeBanner[]; onNavigate: (href: string) => void }) {
  const { width } = useWindowDimensions();
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
    <View style={styles.heroWrap}>
      <FlatList
        ref={carouselRef}
        data={carouselItems}
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
    </View>
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

function Stories({ stories, onOpen }: { stories: HomeStory[]; onOpen: (story: HomeStory) => void }) {
  const publishedStories = stories.filter((story) => !HIDDEN_HOME_STORY_SHORTCUTS.has(story.id));
  const open = (story: HomeStory) => {
    const href = story.items.flatMap(item => [item.link, item.linkUrl]).find(value => {
      try { return !!value && /(^|\.)instagram\.com$/.test(new URL(value).hostname); } catch { return false; }
    });
    if (href) void openInstagram(href);
    else onOpen(story);
  };
  return <LinearGradient colors={['#ffffff', '#fff8fb', '#fff2f7']} style={styles.storiesSection}>
    <View style={styles.storyHeadingRow}>
      <Text style={styles.storyHeading}>Stories da <Text style={styles.storyHeadingAccent}>KA</Text></Text>
      <TouchableOpacity onPress={() => void openInstagram()} accessibilityRole="link" accessibilityLabel="Visitar o Instagram da KA Bijoux">
        <Text style={styles.storyInstagramLink}>Instagram <Ionicons name="open-outline" size={12} color={Colors.primary} /></Text>
      </TouchableOpacity>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyList}>
      <TouchableOpacity style={styles.storyItem} onPress={() => void openInstagram()} accessibilityLabel="Abrir KA Stories no Instagram">
        <LinearGradient colors={['#ffe6a1', '#ffafd1', '#ff4182']} style={styles.storyRing}>
          <View style={styles.storyInner}>
            <Image source={thumbnail(resolveUrl('/images/brand/ka-bijoux-logo-story-icon.png'), 256)} style={styles.storyCover} contentFit="contain" cachePolicy="memory-disk" />
          </View>
        </LinearGradient>
        <View style={styles.instagramBadge}><Ionicons name="logo-instagram" size={13} color="#ec4899" /></View>
        <Text style={styles.storyLabel}>KA Stories</Text>
        <Text style={styles.instagramCaption}>Instagram</Text>
      </TouchableOpacity>
      {publishedStories.map(story => <TouchableOpacity key={story.id} style={styles.storyItem} onPress={() => open(story)} accessibilityLabel={`Abrir ${story.title}`}>
        <LinearGradient colors={['#ffe6a1', '#ffafd1', '#ff4182']} style={styles.storyRing}>
          <View style={styles.storyInner}>
            <Image source={thumbnail(resolveUrl(story.cover || story.coverImageUrl), 256)} style={styles.storyCover} contentFit="cover" cachePolicy="memory-disk" />
          </View>
        </LinearGradient>
        <Text style={styles.storyLabel}>{story.title}</Text>
      </TouchableOpacity>)}
    </ScrollView>
  </LinearGradient>;
}

function QuickCategories({ categories, onNavigate }: { categories: HomeQuickCategory[]; onNavigate: (href: string) => void }) {
  if (!categories.length) return null;
  return <LinearGradient colors={['#fff', '#fffafd', '#fff6fa']} style={styles.quickSection}>
    <View style={styles.quickFrame}><View style={styles.quickGrid}>
      {categories.map(category => <TouchableOpacity key={category.href} style={styles.quickCard}
        accessibilityLabel={`Abrir categoria ${category.label}. ${category.description}`} onPress={() => onNavigate(category.href)}>
        <View style={styles.quickIcon}>{category.icon === "grid"
          ? <Ionicons name="grid-outline" size={27} color={Colors.primary} />
          : <Image source={categoryArtwork[category.icon]} style={{ width: 31, height: 31 }} contentFit="contain" />}</View>
        <Text style={styles.quickTitle}>{category.label}</Text>
        <Ionicons style={styles.quickArrow} name="chevron-forward" size={17} color={Colors.primary} />
      </TouchableOpacity>)}
    </View></View>
  </LinearGradient>;
}

function SeasonalDivider() {
  return <View style={styles.seasonalDivider} accessibilityElementsHidden>
    <View style={styles.seasonalRule} /><Text style={styles.seasonalBranch}>🌿</Text><Text style={styles.seasonalBow}>🎀</Text><Text style={styles.seasonalBranch}>🌿</Text><View style={styles.seasonalRule} />
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

function ProductSection({ section, onNavigate }: { section: HomeProductSection; onNavigate: (href: string) => void }) {
  const { width } = useWindowDimensions();
  if (!section.products.length) return null;
  const gridGap = 8;
  const cardWidth = Math.max(0, (width - 24 - gridGap * 2) / 3);
  return (
    <View style={[styles.productSection, section.background === "subtle" && styles.productSectionSubtle]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          {section.label ? <Text style={styles.eyebrow}>{section.label.toUpperCase()}</Text> : null}
          <Text style={styles.productSectionTitle}>{section.title}</Text>
          {section.subtitle ? <Text style={styles.productSectionSubtitle}>{section.subtitle}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => onNavigate(section.route)}><Text style={styles.more}>Ver mais →</Text></TouchableOpacity>
      </View>
      <View style={styles.productGrid}>
        {section.products.map((product) => (
          <View key={product.id} style={[styles.productCell, { width: cardWidth }]}><ProductCard product={product} badgeSeal={section.badgeSeal} compact /></View>
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
  const cardWidth = Math.max(0, (width - 24 - gap * 2) / 3);
  return (
    <View style={styles.skeletonWrap}>
      <View style={[styles.skeleton, styles.skeletonHero]} />
      <View style={styles.skeletonRow}>
        {[0, 1, 2, 3].map((item) => <View key={item} style={[styles.skeleton, styles.skeletonCircle]} />)}
      </View>
      <View style={[styles.skeleton, styles.skeletonTitle]} />
      <View style={styles.productGrid}>
        {[0, 1, 2].map((item) => <View key={item} style={[styles.skeleton, styles.skeletonProduct, { width: cardWidth }]} />)}
      </View>
    </View>
  );
}

type HomeBlock =
  | { key: "special"; type: "special"; category?: HomeCategory }
  | { key: "hero"; type: "hero"; banners: HomeBanner[] }
  | { key: "stories"; type: "stories"; stories: HomeStory[] }
  | { key: "seasonal-divider"; type: "seasonal-divider" }
  | { key: "quick"; type: "quick"; categories: HomeQuickCategory[] }
  | { key: string; type: "products"; section: HomeProductSection }
  | { key: "benefits"; type: "benefits"; benefits: MobileHomePayload["benefits"] }
  | { key: "reviews"; type: "reviews"; reviews: MobileHomePayload["reviews"] }
  | { key: "final"; type: "final"; cta: MobileHomePayload["finalCta"] };

const HomeBlockView = memo(function HomeBlockView({ block, onNavigate, onOpenStory }: {
  block: HomeBlock;
  onNavigate: (href: string) => void;
  onOpenStory: (story: HomeStory) => void;
}) {
  switch (block.type) {
    case "special": return <SpecialArea category={block.category} onNavigate={onNavigate} />;
    case "hero": return <HeroCarousel banners={block.banners} onNavigate={onNavigate} />;
    case "stories": return <Stories stories={block.stories} onOpen={onOpenStory} />;
    case "seasonal-divider": return <SeasonalDivider />;
    case "quick": return <QuickCategories categories={block.categories} onNavigate={onNavigate} />;
    case "products": return <ProductSection section={block.section} onNavigate={onNavigate} />;
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
  const [selectedStory, setSelectedStory] = useState<HomeStory | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeController = useRef<AbortController | null>(null);
  const hasHomeContent = useRef(false);
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
    const featured: HomeBlock[] = [
      { key: "hero", type: "hero", banners: home.banners },
      { key: "benefits", type: "benefits", benefits: home.benefits },
      { key: "stories", type: "stories", stories: home.stories },
      ...(home.theme?.seasonalDecoration ? [{ key: "seasonal-divider" as const, type: "seasonal-divider" as const }] : []),
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
      {home ? <AnnouncementBar messages={home.announcements} /> : null}
      <Header itemCount={itemCount} onNavigate={navigate} />
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
          <HomeBlockView block={item} onNavigate={navigate} onOpenStory={setSelectedStory} />
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
  safe: { flex: 1, backgroundColor: "#FFF7FA" },
  scroll: { flex: 1 },
  scrollContent: {},
  header: {
    minHeight: Platform.OS === "ios" ? 60 : 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    paddingHorizontal: Platform.OS === "ios" ? 12 : 10,
    paddingVertical: Platform.OS === "ios" ? 6 : 5,
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f7cbd7",
    zIndex: 10,
  },
  wordmark: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 3 },
  wordmarkKa: { color: "#f12b70", fontFamily: "PlayfairDisplay", fontSize: 30, fontWeight: "900", fontStyle: "italic", letterSpacing: -2 },
  wordmarkBijoux: { color: "#b87913", fontFamily: "PlayfairDisplay", fontSize: 21, fontStyle: "italic", letterSpacing: -1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 0 },
  headerButton: { width: Platform.OS === "ios" ? 42 : 38, height: Platform.OS === "ios" ? 42 : 38, alignItems: "center", justifyContent: "center", zIndex: 1 },
  cartBadge: { position: "absolute", right: 0, top: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  announcement: { height: 32, justifyContent: "center", overflow: "hidden", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#fce7f3" },
  announcementTrack: { flexDirection: "row", alignItems: "center", flexShrink: 0, alignSelf: "flex-start" },
  announcementItem: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  announcementText: { color: "#db2777", fontSize: 12, fontWeight: "600", paddingHorizontal: 20 },
  announcementDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#f9a8d4" },
  announcementFade: { position: "absolute", top: 0, bottom: 0, width: 24 },
  announcementFadeLeft: { left: 0 },
  announcementFadeRight: { right: 0 },
  offlineBanner: { minHeight: 38, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fee2e2", flexDirection: "row", gap: 7, alignItems: "center" },
  offlineText: { flex: 1, color: "#7f1d1d", fontSize: 11, fontWeight: "600" },
  heroWrap: { marginTop: Platform.OS === "ios" ? 0 : 8, marginHorizontal: 10, overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: "#f9dce6", ...Shadows.sm },
  heroSlide: { width: "100%", aspectRatio: 2 / 1, backgroundColor: "#FFF7FA" },
  dots: { position: "absolute", left: 0, right: 0, bottom: 8, zIndex: 4, flexDirection: "row", justifyContent: "center", gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.82)" },
  dotActive: { width: 18, backgroundColor: "#f12b70" },
  storiesSection: { marginHorizontal: 10, marginTop: 10, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: '#fce7f3', ...Shadows.sm },
  storyHeadingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  storyHeading: { flex: 1, fontFamily: 'PlayfairDisplay', fontSize: 22, color: '#151015' },
  storyHeadingAccent: { color: Colors.primary },
  storyInstagramLink: { color: Colors.primary, fontSize: 10, fontWeight: "700" },
  instagramBadge: { position: 'absolute', top: 57, right: 1, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  instagramCaption: { marginTop: 3, fontSize: 9, color: '#9ca3af' },
  eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginBottom: 4 },
  sectionHeading: { color: "#6e1430", fontSize: 23, lineHeight: 28, fontFamily: "PlayfairDisplay" },
  storyList: { paddingTop: 10, paddingBottom: 2, gap: 6, justifyContent: "space-between" },
  storyItem: { width: 64, alignItems: "center" },
  storyRing: { width: 60, height: 60, borderRadius: 30, padding: 3 },
  storyInner: { flex: 1, borderRadius: 27, padding: 2, backgroundColor: "#fff" },
  storyCover: { flex: 1, borderRadius: 25, backgroundColor: "#ffe5ee" },
  storyLabel: { marginTop: 5, color: "#48101f", fontSize: 8, fontWeight: "700", width: 64, textAlign: "center" },
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
  storyActions: { minHeight: 76, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  storyNavButton: { minWidth: 82, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  storyNavText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  storyLinkButton: { backgroundColor: Colors.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  storyLinkText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  seasonalDivider: { flexDirection: "row", alignItems: "center", gap: 3, marginHorizontal: 28, marginVertical: 12 },
  seasonalRule: { flex: 1, height: 1, backgroundColor: "#d9a62e" },
  seasonalBranch: { fontSize: 18 },
  seasonalBow: { fontSize: 27, marginHorizontal: -3 },
  quickSection: { paddingHorizontal: 10, paddingVertical: 9 },
  quickFrame: { padding: 0 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: "space-between", gap: 8 },
  quickCard: { width: "31.5%", minHeight: 58, paddingHorizontal: 5, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: '#fce7f3', backgroundColor: '#fffafd', flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 3, ...Shadows.sm },
  quickIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { flex: 1, color: '#192131', fontSize: 9, fontWeight: '800', textAlign: 'center', lineHeight: 11 },
  quickArrow: { marginLeft: "auto" },
  specialArea: { margin: 10, borderRadius: 28, overflow: 'hidden' },
  specialInner: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  specialLabel: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  specialTitle: { fontFamily: 'PlayfairDisplay', color: '#fff', fontSize: 24, marginVertical: 4 },
  specialSubtitle: { color: '#ffe4ef', fontSize: 12 },
  productSection: { paddingHorizontal: 12, paddingVertical: 20, backgroundColor: "#fff" },
  productSectionSubtle: { backgroundColor: Colors.pinkPale },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 16 },
  sectionHeaderCopy: { flex: 1 },
  productSectionTitle: { color: "#111827", fontSize: 25, lineHeight: 31, fontFamily: "PlayfairDisplay" },
  productSectionSubtitle: { color: "#826672", fontSize: 11, lineHeight: 16, marginTop: 4 },
  more: { color: Colors.primary, fontSize: 11, fontWeight: "800" },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "stretch" },
  productCell: { flexGrow: 0, flexShrink: 0, marginBottom: 2 },
  allButton: { alignSelf: "center", marginTop: 16, minHeight: 46, borderRadius: 23, backgroundColor: Colors.primary, paddingHorizontal: 22, maxWidth: "100%", alignItems: "center", justifyContent: "center" },
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
  skeletonHero: { width: "100%", aspectRatio: 2 / 1, marginTop: 10 },
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
