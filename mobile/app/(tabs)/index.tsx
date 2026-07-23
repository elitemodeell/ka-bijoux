import { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, ImageBackground, RefreshControl,
  Animated, Easing, Dimensions, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ProductCard } from "@/components/product/ProductCard";
import { productsApi, categoriesApi, storiesApi } from "@/services/api";
import { getVisibleMobileCategories } from "@/lib/catalogVisibility";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";

const SITE = process.env.EXPO_PUBLIC_API_URL ?? "https://ka-bijoux-backend.vercel.app";
const WHATSAPP = "5537999999999";
const { width: SW } = Dimensions.get("window");
const CARD_W = Math.floor((SW - 32 - 12) / 2);

// ── Hero Banners ─────────────────────────────────────────────────
const BANNERS = [
  {
    id: "1",
    img: `${SITE}/banners/banner-ferias-com-estilo-mobile.webp`,
    title: "Férias com Estilo",
    subtitle: "Ofertas para viajar, sair e se cuidar",
    cta: "Quero Aproveitar",
    route: "/produtos?new=true",
  },
  {
    id: "2",
    img: `${SITE}/banners/banner-mala-pronta-look-completo-mobile.webp`,
    title: "Mala Pronta, Look Completo",
    subtitle: "Capinhas, bolsas e acessórios",
    cta: "Comprar Agora",
    route: "/produtos",
  },
  {
    id: "3",
    img: `${SITE}/banners/banner-destino-ferias-mobile.webp`,
    title: "Destino: Férias",
    subtitle: "Acessórios e bijuterias com alegria",
    cta: "Ver Ofertas",
    route: "/produtos?category=bijuterias",
  },
  {
    id: "4",
    img: `${SITE}/banners/banner-brilhe-nas-ferias-mobile.webp`,
    title: "Brilhe nas Férias",
    subtitle: "Peças delicadas para seu visual",
    cta: "Quero Brilhar",
    route: "/produtos?category=bijuterias",
  },
];

// ── Stories ──────────────────────────────────────────────────────
type StoryType = { id: string; label: string; img: string; route: string };

const HIGHLIGHT_COVERS: Record<string, string> = {
  novidades:   `${SITE}/images/stories/highlights/novidades.jpg`,
  promocoes:   `${SITE}/images/stories/highlights/promocoes.jpg`,
  lancamentos: `${SITE}/images/stories/highlights/lancamentos.jpg`,
  clientes:    `${SITE}/images/stories/highlights/clientes.jpg`,
  ofertas:     `${SITE}/images/stories/highlights/ofertas.jpg`,
};

const STORY_FALLBACK: StoryType[] = [
  { id: "novidades",   label: "Novidades",   img: HIGHLIGHT_COVERS.novidades,   route: "/produtos?new=true" },
  { id: "promocoes",   label: "Promoções",   img: HIGHLIGHT_COVERS.promocoes,   route: "/produtos?promo=true" },
  { id: "lancamentos", label: "Lançamentos", img: HIGHLIGHT_COVERS.lancamentos, route: "/produtos" },
  { id: "clientes",    label: "Clientes",    img: HIGHLIGHT_COVERS.clientes,    route: "/produtos" },
  { id: "ofertas",     label: "Ofertas",     img: HIGHLIGHT_COVERS.ofertas,     route: "/produtos?promo=true" },
];

function getHighlightCover(str: string): string | null {
  const key = str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const match = Object.keys(HIGHLIGHT_COVERS).find((k) => key.includes(k));
  return match ? HIGHLIGHT_COVERS[match] : null;
}

// ── Quick categories ─────────────────────────────────────────────
const QUICK_CATS = [
  { label: "Novidades",   emoji: "✨", route: "/produtos?new=true" },
  { label: "Promoções",   emoji: "🏷️", route: "/produtos?promo=true" },
  { label: "Lançamentos", emoji: "🆕", route: "/produtos" },
  { label: "Bijuterias",  emoji: "💎", route: "/produtos?category=bijuterias" },
  { label: "Capinhas",    emoji: "📱", route: "/produtos?category=capinhas-acessorios-celular" },
  { label: "Bolsas",      emoji: "👜", route: "/produtos?category=bolsas-necessaires" },
  { label: "Maquiagem",   emoji: "💄", route: "/produtos?category=maquiagem" },
  { label: "Utilidades",  emoji: "🏡", route: "/produtos?category=utilidades-domesticas" },
  { label: "Perfumes",    emoji: "🌸", route: "/produtos?category=perfumaria" },
  { label: "Ver Mais",    emoji: "☰",  route: "/produtos" },
];

// ── Payment methods ──────────────────────────────────────────────
const PAYMENTS = [
  { label: "Pix",        color: "#22c7b8" },
  { label: "Visa",       color: "#1f5cc9" },
  { label: "Mastercard", color: "#f15a24" },
  { label: "Amex",       color: "#2878c8" },
  { label: "Elo",        color: "#444" },
  { label: "Boleto",     color: "#444" },
];

// ── Ticker ───────────────────────────────────────────────────────
const TICKER = [
  "💖 Novidades selecionadas para você",
  "📱 Capinhas estilosas para o seu celular",
  "🏡 Utilidades charmosas para sua rotina",
  "✨ Bijuterias delicadas para o dia a dia",
  "🛍️ Acessórios femininos com estilo",
  "🚚 Envio para todo o Brasil",
  "💳 Pix e cartão disponíveis",
  "🎁 Presentes especiais para quem você ama",
].join("   •   ");

// ── Testimonials ─────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Mariana Costa",
    city: "Itaúna – MG",
    text: "Amei os brincos que comprei! A qualidade é ótima e a entrega foi super rápida. Com certeza vou comprar mais vezes!",
    stars: 5,
    avatar: "MC",
  },
  {
    name: "Julia Fernandes",
    city: "Belo Horizonte – MG",
    text: "Os óculos são lindíssimos e chegaram muito bem embalados. A loja é incrível, atendimento maravilhoso!",
    stars: 5,
    avatar: "JF",
  },
  {
    name: "Ana Beatriz Lima",
    city: "São Paulo – SP",
    text: "Já é a quarta vez que compro na KA Bijoux. Os produtos são exatamente como nas fotos. Super recomendo!",
    stars: 5,
    avatar: "AB",
  },
];

// ────────────────────────────────────────────────────────────────
// AnnouncementBar — ticker rolante (P3: texto sem truncamento)
// ────────────────────────────────────────────────────────────────
function AnnouncementBar() {
  const x = useRef(new Animated.Value(SW)).current;
  const textW = TICKER.length * 8;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(x, {
          toValue: -textW,
          duration: (SW + textW) * 14,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(x, { toValue: SW, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={s.ticker}>
      <Animated.Text
        style={[s.tickerText, { transform: [{ translateX: x }], width: textW + SW + 100 }]}
      >
        {TICKER}
      </Animated.Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// SexShopCard — glassmorphism com imagem de fundo (P7)
// ────────────────────────────────────────────────────────────────
function SexShopCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={s.ssWrapper}>
      <ImageBackground
        source={{ uri: `${SITE}/banners/ka-intima-hero-premium-mobile.webp` }}
        style={s.ssContainer}
        imageStyle={{ borderRadius: BorderRadius["2xl"] }}
      >
        <LinearGradient
          colors={[
            "rgba(64,5,29,0.97)",
            "rgba(178,15,78,0.90)",
            "rgba(255,79,135,0.62)",
            "rgba(75,5,33,0.97)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.ssGrad}
        >
          {/* glow blob top-left */}
          <View style={s.ssGlow} pointerEvents="none" />

          {/* glass heart icon */}
          <View style={s.ssHeart}>
            <Ionicons name="heart" size={28} color="rgba(255,240,250,0.95)" />
          </View>

          <View style={s.ssContent}>
            <View style={s.ssSpecialBadge}>
              <Text style={s.ssSpecialBadgeText}>ÁREA ESPECIAL</Text>
            </View>
            <Text style={s.ssTitle}>Entrar no Sex Shop</Text>
            <Text style={s.ssSub}>Lingerie e produtos especiais</Text>
          </View>

          {/* circular white arrow */}
          <View style={s.ssArrowCircle}>
            <Ionicons name="chevron-forward" size={20} color="#b30f51" />
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────────────
// LingerieBar
// ────────────────────────────────────────────────────────────────
function LingerieBar({ onNav }: { onNav: (r: string) => void }) {
  return (
    <View style={s.lingRow}>
      <TouchableOpacity style={s.lingBtn} onPress={() => onNav("/produtos?category=lingerie")}>
        <Ionicons name="heart-outline" size={14} color={Colors.primary} />
        <Text style={s.lingText}>Lingerie</Text>
      </TouchableOpacity>
      <View style={s.lingDivider} />
      <TouchableOpacity style={s.lingBtn} onPress={() => onNav("/produtos?category=sex-shop")}>
        <Text style={s.lingText}>Moda Íntima</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// HeroBanners — carrossel com título + subtítulo + CTA (P6)
// ────────────────────────────────────────────────────────────────
function HeroBanners({ onNav }: { onNav: (r: string) => void }) {
  const [idx, setIdx] = useState(0);
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((p) => {
        const n = (p + 1) % BANNERS.length;
        ref.current?.scrollTo({ x: n * SW, animated: true });
        return n;
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <View>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) =>
          setIdx(Math.round(e.nativeEvent.contentOffset.x / SW))
        }
      >
        {BANNERS.map((b) => (
          <TouchableOpacity
            key={b.id}
            activeOpacity={0.96}
            onPress={() => onNav(b.route)}
            style={{ width: SW }}
          >
            <View style={{ width: SW, height: SW * 0.74 }}>
              <Image
                source={{ uri: b.img }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              {/* gradient overlay at bottom */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.58)"]}
                style={s.slideOverlay}
                pointerEvents="none"
              />
              {/* text + CTA */}
              <View style={s.slideInfo} pointerEvents="none">
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={s.slideTitle} numberOfLines={1}>{b.title}</Text>
                  {b.subtitle ? (
                    <Text style={s.slideSub} numberOfLines={1}>{b.subtitle}</Text>
                  ) : null}
                </View>
                <View style={s.slideCTA}>
                  <Text style={s.slideCTAText}>{b.cta}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={s.dots}>
        {BANNERS.map((_, i) => (
          <View key={i} style={[s.dot, i === idx && s.dotActive]} />
        ))}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// StoriesRow — busca de /api/stories com fallback (P11)
// ────────────────────────────────────────────────────────────────
function StoriesRow({ onNav }: { onNav: (r: string) => void }) {
  const [stories, setStories] = useState<StoryType[]>(STORY_FALLBACK);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await storiesApi.list();
        const groups: any[] = res.data?.data;
        if (!alive || !Array.isArray(groups) || groups.length === 0) return;
        const mapped = groups
          .filter((g) => g.isActive !== false && Array.isArray(g.items) && g.items.length > 0)
          .slice(0, 6)
          .map((g): StoryType => ({
            id: g.id,
            label: g.title,
            img:
              getHighlightCover(g.title) ||
              getHighlightCover(g.id) ||
              g.coverImageUrl ||
              g.cover ||
              STORY_FALLBACK[0].img,
            route: "/produtos",
          }));
        if (alive && mapped.length > 0) setStories(mapped);
      } catch {
        // keep fallback
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  return (
    <View style={s.storiesBox}>
      <View style={s.storiesHeader}>
        <View style={{ flex: 1 }}>
          <View style={s.storiesBadge}>
            <Text style={s.storiesBadgeText}>TOQUE PARA VER</Text>
          </View>
          <Text style={s.storiesTitle}>Acompanhe nossos stories</Text>
          <Text style={s.storiesSub}>Novidades, promoções e achadinhos em destaque.</Text>
        </View>
        <View style={s.storiesPlayBtn}>
          <Ionicons name="play-circle-outline" size={24} color={Colors.primary} />
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingBottom: 4, paddingTop: 8 }}
      >
        {stories.map((story) => (
          <TouchableOpacity
            key={story.id}
            style={s.storyItem}
            onPress={() => onNav(story.route)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[Colors.primary, "#c8274a", "#ff4d6d"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.storyRing}
            >
              <View style={s.storyInner}>
                <Image source={{ uri: story.img }} style={s.storyImg} />
              </View>
            </LinearGradient>
            <Text style={s.storyLabel} numberOfLines={1}>{story.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// FeriasBanner — banner estático de campanha (P3)
// ────────────────────────────────────────────────────────────────
function FeriasBanner({ onNav }: { onNav: (r: string) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onNav("/produtos?new=true")}
      activeOpacity={0.96}
      style={{ marginTop: 14 }}
    >
      <Image
        source={{ uri: `${SITE}/banners/banner-destino-ferias-mobile.webp` }}
        style={{ width: SW, height: SW * 0.75 }}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────────────
// FeriasPromoStrip — faixa "FÉRIAS COM ESTILO ✈️" (P3)
// ────────────────────────────────────────────────────────────────
function FeriasPromoStrip({ onNav }: { onNav: (r: string) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onNav("/produtos?new=true")}
      activeOpacity={0.88}
      style={{ marginTop: 4 }}
    >
      <LinearGradient
        colors={["#db2777", "#f43f5e", "#fb923c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.feriaStrip}
      >
        <View style={s.feriaLeft}>
          <View style={s.feriaPlane}>
            <Text style={{ fontSize: 28 }}>✈️</Text>
          </View>
          <View>
            <Text style={s.feriaTitle}>FÉRIAS COM ESTILO!</Text>
            <Text style={s.feriaSub}>Ofertas para viajar, sair e se cuidar</Text>
          </View>
        </View>
        <View style={s.feriaBtn}>
          <Text style={s.feriaBtnText}>QUERO{"\n"}APROVEITAR →</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ────────────────────────────────────────────────────────────────
// QuickCategoryGrid (5×2)
// ────────────────────────────────────────────────────────────────
function QuickCategoryGrid({ onNav }: { onNav: (r: string) => void }) {
  return (
    <View style={s.quickGrid}>
      {QUICK_CATS.map((cat) => (
        <TouchableOpacity
          key={cat.label}
          style={s.quickItem}
          onPress={() => onNav(cat.route)}
          activeOpacity={0.8}
        >
          <View style={s.quickCircle}>
            <Text style={s.quickEmoji}>{cat.emoji}</Text>
          </View>
          <Text style={s.quickLabel} numberOfLines={1}>{cat.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// ProductSection — grade 2 colunas
// ────────────────────────────────────────────────────────────────
type Prod = {
  id: string; slug?: string | null; name: string; price: number;
  promotionalPrice?: number | null; stock: number;
  images: Array<{ url: string }>; isNew?: boolean; featured?: boolean;
};

function ProductSection({
  label, title, subtitle, products, route,
}: {
  label?: string; title: string; subtitle?: string; products: unknown[]; route?: string;
}) {
  const router = useRouter();
  if (!products.length) return null;
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={{ flex: 1 }}>
          {label && <Text style={s.sectionLabel}>{label}</Text>}
          <Text style={s.sectionTitle}>{title}</Text>
          {subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
        </View>
        <TouchableOpacity onPress={() => router.push((route ?? "/produtos") as never)}>
          <Text style={s.seeAll}>Ver mais →</Text>
        </TouchableOpacity>
      </View>
      <View style={s.productGrid}>
        {(products as Prod[]).slice(0, 10).map((item) => (
          <View key={item.id} style={{ width: CARD_W }}>
            <ProductCard product={item} />
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={s.viewAllBtn}
        onPress={() => router.push((route ?? "/produtos") as never)}
      >
        <Text style={s.viewAllBtnText}>Ver todos os produtos →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// FeaturesStrip (faixa rosa de benefícios)
// ────────────────────────────────────────────────────────────────
function FeaturesStrip({ onNav }: { onNav: (r: string) => void }) {
  return (
    <LinearGradient
      colors={[Colors.primary, "#e83e5a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={s.featStrip}
    >
      {[
        { emoji: "🎁", title: "Envio e retirada",   sub: "Escolha a melhor forma" },
        { emoji: "💳", title: "Pix e cartão",        sub: "Pagamento facilitado" },
        { emoji: "🚀", title: "Compra segura",       sub: "Pedido acompanhado" },
      ].map((f, i) => (
        <View key={i} style={s.featStripItem}>
          <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
          <Text style={s.featStripTitle}>{f.title}</Text>
          <Text style={s.featStripSub}>{f.sub}</Text>
        </View>
      ))}
      <TouchableOpacity style={s.featStripBtn} onPress={() => onNav("/produtos")}>
        <Text style={s.featStripBtnText}>Aproveitar →</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

// ────────────────────────────────────────────────────────────────
// Depoimentos — 3 avaliações de clientes (P4)
// ────────────────────────────────────────────────────────────────
function Depoimentos() {
  return (
    <View style={s.depoSection}>
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <Text style={s.depoBadge}>AVALIAÇÕES</Text>
        <Text style={s.depoTitle}>O que nossas clientes dizem</Text>
      </View>
      {TESTIMONIALS.map((t) => (
        <View key={t.name} style={s.depoCard}>
          <Text style={s.depoStars}>{"★".repeat(t.stars)}</Text>
          <Text style={s.depoText}>"{t.text}"</Text>
          <View style={s.depoAuthor}>
            <LinearGradient
              colors={["#f472b6", "#ec4899"]}
              style={s.depoAvatar}
            >
              <Text style={s.depoAvatarText}>{t.avatar}</Text>
            </LinearGradient>
            <View>
              <Text style={s.depoName}>{t.name}</Text>
              <Text style={s.depoCity}>{t.city}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// DarkCTASection
// ────────────────────────────────────────────────────────────────
function DarkCTASection({ onNav }: { onNav: (r: string) => void }) {
  return (
    <LinearGradient colors={["#17070C", "#200a12", "#080204"]} style={s.darkCta}>
      <Text style={s.darkCtaBadge}>SUA LOJA FAVORITA</Text>
      <Text style={s.darkCtaTitle}>
        Pronta para se sentir{"\n"}
        <Text style={{ color: Colors.primary }}>ainda mais linda?</Text>
      </Text>
      <Text style={s.darkCtaDesc}>
        Veja nossa coleção completa e encontre o acessório perfeito para cada momento.
      </Text>
      <TouchableOpacity style={s.darkCtaBtn} onPress={() => onNav("/produtos")}>
        <Text style={s.darkCtaBtnText}>Ver coleção ✨</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

// ────────────────────────────────────────────────────────────────
// FeatureCards
// ────────────────────────────────────────────────────────────────
function FeatureCards() {
  const items = [
    { icon: "car-outline" as const,              title: "Entrega rápida",        sub: "Para todo Brasil" },
    { icon: "shield-checkmark-outline" as const, title: "Compra segura",         sub: "Dados protegidos" },
    { icon: "diamond-outline" as const,          title: "Produtos selecionados", sub: "Qualidade garantida" },
    { icon: "gift-outline" as const,             title: "Mimos exclusivos",      sub: "Em todos os pedidos" },
  ];
  return (
    <View style={s.featCardsBg}>
      <View style={s.featCards}>
        {items.map((f, i) => (
          <View key={i} style={s.featCard}>
            <View style={s.featCardIconWrap}>
              <Ionicons name={f.icon} size={28} color={Colors.primary} />
            </View>
            <Text style={s.featCardTitle}>{f.title}</Text>
            <Text style={s.featCardSub}>{f.sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// FooterDark
// ────────────────────────────────────────────────────────────────
function FooterDark() {
  return (
    <View style={s.footerDark}>
      <Text style={s.brandKA}>KA</Text>
      <Text style={s.brandBijoux}>bijoux</Text>
      <Text style={s.brandDesc}>
        Bijuterias, óculos, capinhas e acessórios femininos com curadoria delicada para deixar sua rotina mais bonita.
      </Text>

      <View style={s.socialRow}>
        {[
          { label: "Instagram", icon: "logo-instagram", url: "https://instagram.com/kabijoux" },
          { label: "Facebook",  icon: "logo-facebook",  url: "https://facebook.com/kabijoux" },
          { label: "WhatsApp",  icon: "logo-whatsapp",  url: `https://wa.me/${WHATSAPP}` },
        ].map(({ label, icon, url }) => (
          <TouchableOpacity
            key={label}
            style={s.socialBtn}
            onPress={() => Linking.openURL(url)}
            activeOpacity={0.8}
          >
            <Ionicons name={icon as any} size={20} color="#fff" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.contactCard}>
        <View style={s.contactLeft}>
          <View style={s.contactIcon}>
            <Ionicons name="headset-outline" size={22} color={Colors.primary} />
          </View>
          <View>
            <Text style={s.contactTitle}>Fale com a gente</Text>
            <Text style={s.contactSub}>Segunda a Sexta</Text>
            <Text style={s.contactSub}>09h às 18h</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.waBtn}
          onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP}`)}
          activeOpacity={0.85}
        >
          <Text style={s.waBtnText}>WhatsApp →</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.payTitle}>FORMAS DE PAGAMENTO</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.payRow}
      >
        {PAYMENTS.map((p) => (
          <View key={p.label} style={s.payChip}>
            <Text style={[s.payChipText, { color: p.color }]}>{p.label}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.footerBottom}>
        <Ionicons name="heart" size={20} color={Colors.primary} />
        <Text style={s.footerLove}>Feito com amor</Text>
        <Text style={s.footerLoveSub}>para você brilhar todos os dias.</Text>
        <Text style={s.footerCopy}>© 2026 KA Bijoux</Text>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────
// Data helpers
// ────────────────────────────────────────────────────────────────
function mergeUnique(...pools: unknown[][]): Prod[] {
  const seen = new Set<string>();
  const result: Prod[] = [];
  for (const pool of pools) {
    for (const p of pool as Prod[]) {
      if (p?.id && !seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
    }
  }
  return result;
}

function takeSection(pool: Prod[], usedIds: Set<string>, n: number): Prod[] {
  const result: Prod[] = [];
  for (const p of pool) {
    if (!usedIds.has(p.id)) {
      result.push(p);
      usedIds.add(p.id);
      if (result.length >= n) break;
    }
  }
  return result;
}

// ────────────────────────────────────────────────────────────────
// HomeScreen
// ────────────────────────────────────────────────────────────────
type HomeCategory = {
  id: string;
  name: string;
  slug: string;
  mobileProductCount?: number | null;
  _count?: { products: number };
};

interface HomeData {
  categories: HomeCategory[];
  ofertas: Prod[];
  achadinhos: Prod[];
  novidades: Prod[];
  maisVendidos: Prod[];
  paraPresentes: Prod[];
  beleza: Prod[];
}

export default function HomeScreen() {
  const router = useRouter();
  const { customer } = useAuthStore();
  const { itemCount, fetchCart } = useCartStore();
  const [data, setData] = useState<HomeData>({
    categories: [], ofertas: [], achadinhos: [],
    novidades: [], maisVendidos: [], paraPresentes: [], beleza: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  const nav = useCallback((route: string) => router.push(route as never), [router]);

  // P5 — 4 chamadas paralelas, pools específicos por seção (igual ao site)
  async function loadData() {
    try {
      const q = { withImage: true, line: "normal" };
      const [catRes, mainRes, featuredRes, newRes, promoRes] = await Promise.allSettled([
        categoriesApi.list(),
        productsApi.list({ ...q, pageSize: 50 }),
        productsApi.list({ ...q, featured: true, pageSize: 24 }),
        productsApi.list({ ...q, "new": true, pageSize: 24 }),
        productsApi.list({ ...q, promo: true, pageSize: 24 }),
      ]);

      const cats   = catRes.status      === "fulfilled" ? getVisibleMobileCategories<HomeCategory>(catRes.value.data.data ?? [], { limit: 8 }) : [];
      const mainP  = mainRes.status     === "fulfilled" ? (mainRes.value.data.data?.products     ?? []) : [];
      const featP  = featuredRes.status === "fulfilled" ? (featuredRes.value.data.data?.products ?? []) : [];
      const newP   = newRes.status      === "fulfilled" ? (newRes.value.data.data?.products      ?? []) : [];
      const promoP = promoRes.status    === "fulfilled" ? (promoRes.value.data.data?.products    ?? []) : [];

      const allPool = mergeUnique(mainP, featP, newP, promoP);
      const usedIds = new Set<string>();

      const ofertas       = takeSection(mergeUnique(promoP, featP, mainP), usedIds, 8);
      const achadinhos    = takeSection(mergeUnique(mainP),                usedIds, 8);
      const novidades     = takeSection(mergeUnique(newP, mainP),          usedIds, 8);
      const maisVendidos  = takeSection(mergeUnique(featP, mainP),         usedIds, 10);
      const paraPresentes = takeSection(allPool,                           usedIds, 8);
      const beleza        = takeSection(allPool,                           usedIds, 8);

      setData({ categories: cats, ofertas, achadinhos, novidades, maisVendidos, paraPresentes, beleza });
    } catch (e) {
      console.error("[Home] loadData:", e);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
    if (customer) fetchCart();
  }, [customer]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, []);

  const { categories, ofertas, achadinhos, novidades, maisVendidos, paraPresentes, beleza } = data;

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>

      {/* Header — P10: barra de busca inline */}
      <View style={s.header}>
        <View style={s.headerLogo}>
          <Text style={s.logoKA}>KA</Text>
          <Text style={s.logoBijoux}>bijoux</Text>
        </View>

        <TouchableOpacity
          style={s.searchBar}
          onPress={() => router.push("/busca")}
          activeOpacity={0.8}
        >
          <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
          <Text style={s.searchPlaceholder} numberOfLines={1}>O que você procura?</Text>
          <View style={s.searchBtn}>
            <Ionicons name="search" size={13} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.cartIconBtn}
          onPress={() => router.push("/(tabs)/carrinho")}
        >
          <Ionicons name="bag-outline" size={22} color={Colors.textPrimary} />
          {itemCount > 0 && (
            <View style={s.cartBadge}>
              <Text style={s.cartBadgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Ticker */}
      <AnnouncementBar />

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >

        {/* Sex Shop banner (P7) */}
        <SexShopCard onPress={() => nav("/categoria/sex-shop")} />
        <LingerieBar onNav={nav} />

        {/* Hero banners (P6) */}
        <View style={{ marginTop: 12 }}>
          <HeroBanners onNav={nav} />
        </View>

        {/* Stories (P11) */}
        <StoriesRow onNav={nav} />

        {/* Férias banner (P3) */}
        <FeriasBanner onNav={nav} />

        {/* Férias strip (P3) */}
        <FeriasPromoStrip onNav={nav} />

        {/* Grade de categorias */}
        <QuickCategoryGrid onNav={nav} />

        {/* Ofertas Relâmpago */}
        <ProductSection
          label="IMPERDÍVEIS"
          title="Ofertas Relâmpago 🔥"
          products={ofertas}
          route="/produtos?promo=true"
        />

        {/* Achadinhos */}
        <ProductSection
          label="ACHADOS DA SEMANA"
          title="Achadinhos KA Bijoux 💖"
          subtitle="Produtos lindos para comprar sem pensar muito."
          products={achadinhos}
        />

        {/* Faixa rosa — P2: movida para cá (após Achadinhos, igual ao site) */}
        <View style={{ marginTop: 4 }}>
          <FeaturesStrip onNav={nav} />
        </View>

        {/* Novidades */}
        <ProductSection
          label="CHEGANDO AGORA"
          title="Novidades 🆕"
          products={novidades}
          route="/produtos?new=true"
        />

        {/* Mais Vendidos */}
        <ProductSection
          label="TOP DA SEMANA"
          title="Mais Vendidos ⭐"
          products={maisVendidos}
        />

        {/* Para Presentear */}
        <ProductSection
          label="IDEIAS DE PRESENTE"
          title="Para Presentear 🎁"
          products={paraPresentes}
        />

        {/* Beleza e Autocuidado */}
        <ProductSection
          label="BELEZA E BEM-ESTAR"
          title="Beleza e Autocuidado ✨"
          products={beleza}
        />

        {/* Depoimentos — P4 */}
        <Depoimentos />

        {/* CTA escuro */}
        <DarkCTASection onNav={nav} />

        {/* Cards de benefícios */}
        <FeatureCards />

        {/* Categorias */}
        {categories.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Categorias</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/categorias")}>
                <Text style={s.seeAll}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 10, paddingBottom: 4 }}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={s.catChip}
                  onPress={() => nav(`/produtos?category=${cat.slug}`)}
                  activeOpacity={0.8}
                >
                  <Text style={s.catChipText}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Rodapé */}
        <FooterDark />

      </ScrollView>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },

  // ── Header (P10) ──────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  headerLogo: {
    // natural width
  },
  logoKA: {
    fontSize: 24,
    fontWeight: "900",
    color: Colors.primary,
    lineHeight: 26,
  },
  logoBijoux: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
    lineHeight: 13,
    fontStyle: "italic",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
  },
  searchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cartIconBtn: {
    width: 38,
    height: 38,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Shadows.sm,
  },
  cartBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: Colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },

  // ── Ticker ────────────────────────────────────────────────────
  ticker: {
    height: 36,
    backgroundColor: "#fff0f3",
    borderBottomWidth: 1,
    borderBottomColor: "#ffc0cb",
    overflow: "hidden",
    justifyContent: "center",
  },
  tickerText: { fontSize: 12, fontWeight: "600", color: Colors.primary },

  // ── SexShopCard (P7) ─────────────────────────────────────────
  ssWrapper: {
    marginHorizontal: Spacing.base,
    marginTop: 14,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    ...Shadows.md,
  },
  ssContainer: {},
  ssGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
    minHeight: 102,
    borderRadius: BorderRadius["2xl"],
  },
  ssGlow: {
    position: "absolute",
    top: -24,
    left: -24,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  ssHeart: {
    width: 56,
    height: 56,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  ssContent: { flex: 1 },
  ssSpecialBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 5,
  },
  ssSpecialBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,240,250,0.9)",
    letterSpacing: 1.5,
  },
  ssTitle: { fontSize: 21, fontWeight: "800", color: "#fff", marginBottom: 2 },
  ssSub:   { fontSize: 13, color: "rgba(255,240,250,0.85)" },
  ssArrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#500020",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },

  // ── LingerieBar ───────────────────────────────────────────────
  lingRow: {
    flexDirection: "row",
    alignSelf: "center",
    marginTop: 8,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.pinkLight,
    backgroundColor: "rgba(255,255,255,0.94)",
    overflow: "hidden",
  },
  lingBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  lingDivider: { width: 1, backgroundColor: Colors.pinkLight },
  lingText: { fontSize: 13, fontWeight: "800", color: Colors.primary },

  // ── Hero banners (P6) ─────────────────────────────────────────
  dots:      { flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 10 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.pinkLight },
  dotActive: { width: 18, backgroundColor: Colors.primary },
  slideOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  slideInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  slideTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  slideSub: {
    fontSize: 10,
    color: "rgba(255,255,255,0.82)",
    marginTop: 2,
  },
  slideCTA: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    flexShrink: 0,
  },
  slideCTAText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ── Stories ───────────────────────────────────────────────────
  storiesBox: {
    marginTop: 14,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.pinkLight,
    backgroundColor: "#fff7fb",
    paddingTop: 14,
    paddingBottom: 12,
    ...Shadows.sm,
  },
  storiesHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 2,
  },
  storiesBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  storiesBadgeText:  { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  storiesTitle:      { fontSize: 17, fontWeight: "900", color: Colors.textPrimary },
  storiesSub:        { fontSize: 11, color: "#8a4b5d", fontWeight: "600", marginTop: 2 },
  storiesPlayBtn:    {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
    ...Shadows.sm,
  },
  storyItem:  { alignItems: "center", width: 72 },
  storyRing:  { width: 68, height: 68, borderRadius: 34, padding: 3, marginBottom: 6 },
  storyInner: { flex: 1, borderRadius: 31, overflow: "hidden", borderWidth: 2, borderColor: "#fff" },
  storyImg:   { width: "100%", height: "100%" },
  storyLabel: { fontSize: 11, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },

  // ── FeriasBanner (P3) ─────────────────────────────────────────
  // (Image inline, no extra style needed)

  // ── FeriasPromoStrip (P3) ─────────────────────────────────────
  feriaStrip: {
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  feriaLeft:  { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  feriaPlane: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  feriaTitle: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: 0.5 },
  feriaSub:   { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 },
  feriaBtn: {
    backgroundColor: "#fff",
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    flexShrink: 0,
  },
  feriaBtnText: {
    color: Colors.primary,
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: "center",
  },

  // ── QuickCategoryGrid ─────────────────────────────────────────
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    gap: 0,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  quickItem:   { width: "20%", alignItems: "center", paddingVertical: 8, gap: 5 },
  quickCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#fff0f6", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.pinkLight,
  },
  quickEmoji: { fontSize: 20 },
  quickLabel: { fontSize: 10, fontWeight: "600", color: Colors.textPrimary, textAlign: "center" },

  // ── ProductSection ────────────────────────────────────────────
  section:      { marginTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: Colors.primary, letterSpacing: 1, marginBottom: 2 },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.textPrimary },
  sectionSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  seeAll:       { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: "600" },
  productGrid:  { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12 },
  viewAllBtn: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 11,
    alignItems: "center",
  },
  viewAllBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 13 },

  // ── FeaturesStrip ─────────────────────────────────────────────
  featStrip:       { marginHorizontal: Spacing.base, borderRadius: BorderRadius.xl, padding: 16, gap: 12 },
  featStripItem:   { alignItems: "center", gap: 3 },
  featStripTitle:  { color: "#fff", fontWeight: "700", fontSize: 13 },
  featStripSub:    { color: "rgba(255,255,255,0.8)", fontSize: 10 },
  featStripBtn:    {
    backgroundColor: "#fff",
    borderRadius: BorderRadius.xl,
    paddingVertical: 10,
    alignItems: "center",
  },
  featStripBtnText: { color: Colors.primary, fontWeight: "800", fontSize: 13 },

  // ── Depoimentos (P4) ─────────────────────────────────────────
  depoSection: {
    marginTop: 20,
    paddingHorizontal: Spacing.base,
    paddingBottom: 8,
    backgroundColor: "#fdf7fb",
    paddingTop: 24,
  },
  depoBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  depoTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  depoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.pinkLight,
    padding: 18,
    marginBottom: 12,
    ...Shadows.sm,
  },
  depoStars:  { color: "#facc15", fontSize: 16, marginBottom: 10 },
  depoText:   { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  depoAuthor: { flexDirection: "row", alignItems: "center", gap: 12 },
  depoAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  depoAvatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  depoName:   { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  depoCity:   { fontSize: 11, color: Colors.textMuted },

  // ── DarkCTA ───────────────────────────────────────────────────
  darkCta:       { marginTop: 20, paddingHorizontal: 24, paddingVertical: 40, alignItems: "center" },
  darkCtaBadge:  { fontSize: 10, fontWeight: "800", color: Colors.primary, letterSpacing: 1.5, marginBottom: 12 },
  darkCtaTitle:  { fontSize: 28, fontWeight: "900", color: "#fff", textAlign: "center", lineHeight: 36, marginBottom: 12 },
  darkCtaDesc:   { fontSize: 14, color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  darkCtaBtn:    {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  darkCtaBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  // ── FeatureCards ──────────────────────────────────────────────
  featCardsBg:      { backgroundColor: "#17070C", paddingVertical: 20, paddingHorizontal: 16 },
  featCards:        { gap: 12 },
  featCard: {
    borderRadius: 26, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.055)",
    padding: 20, alignItems: "center", gap: 8,
  },
  featCardIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "rgba(255,79,135,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  featCardTitle: { fontSize: 15, fontWeight: "900", color: "#fff", textAlign: "center" },
  featCardSub:   { fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center" },

  // ── Footer ────────────────────────────────────────────────────
  footerDark: { backgroundColor: "#17070C", paddingHorizontal: 20, paddingTop: 32, paddingBottom: 24 },
  brandKA:    { fontSize: 40, fontWeight: "900", color: Colors.primary, textAlign: "center", lineHeight: 44 },
  brandBijoux: {
    fontSize: 18, fontWeight: "400", color: Colors.primary,
    textAlign: "center", fontStyle: "italic", marginBottom: 12,
  },
  brandDesc: {
    fontSize: 13, color: "rgba(255,255,255,0.65)",
    textAlign: "center", lineHeight: 20, marginBottom: 20,
  },
  socialRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 24 },
  socialBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.075)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  contactCard: {
    borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,79,135,0.35)",
    backgroundColor: "#2a0b15", padding: 18, marginBottom: 24, gap: 14,
  },
  contactLeft:  { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  contactIcon:  {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: Colors.primary + "22",
    alignItems: "center", justifyContent: "center",
  },
  contactTitle: { fontSize: 16, fontWeight: "900", color: "#fff", marginBottom: 4 },
  contactSub:   { fontSize: 13, color: "rgba(255,255,255,0.6)" },
  waBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 12, alignItems: "center",
  },
  waBtnText:    { color: "#fff", fontWeight: "800", fontSize: 14 },
  payTitle:     { fontSize: 10, fontWeight: "900", color: Colors.primary, letterSpacing: 2, textAlign: "center", marginBottom: 14 },
  payRow:       { gap: 10, paddingBottom: 4 },
  payChip: {
    minWidth: 90, height: 48, borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 12,
  },
  payChipText:  { fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
  footerBottom: { marginTop: 24, alignItems: "center", gap: 4 },
  footerLove:   { fontSize: 18, fontStyle: "italic", color: "#fff", fontWeight: "500" },
  footerLoveSub:{ fontSize: 13, color: "rgba(255,255,255,0.55)" },
  footerCopy:   { fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 8 },

  // ── Category chips ────────────────────────────────────────────
  catChip: {
    backgroundColor: Colors.pinkSoft,
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.pinkLight,
  },
  catChipText: { fontSize: FontSizes.sm, color: Colors.primaryDark, fontWeight: "600" },
});
