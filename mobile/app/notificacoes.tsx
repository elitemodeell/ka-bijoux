import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Platform, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { notificationsApi } from "@/services/api";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { LuxuryBackground } from "@/components/ios/LuxuryBackground";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PEDIDO_CONFIRMADO: "bag-check",
  PAGAMENTO_APROVADO: "checkmark-circle",
  EM_SEPARACAO: "cube",
  PRONTO_RETIRADA: "storefront",
  SAIU_ENTREGA: "bicycle",
  ENTREGUE: "home",
  PROMOCAO: "pricetag",
  SISTEMA: "information-circle",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function NotificacoesScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data.data ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await notificationsApi.markRead(id).catch(() => {});
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationsApi.markAllRead().catch(() => {});
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (Platform.OS === "ios" && !loading) {
    return (
      <SafeAreaView style={iosStyles.safe} edges={["top"]}>
        <LuxuryBackground />
        <ScrollView
          contentContainerStyle={iosStyles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#e90058" />}
        >
          <View style={iosStyles.topRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={iosStyles.backButton}>
              <Ionicons name="arrow-back" size={25} color="#d90050" />
            </TouchableOpacity>
            <Text style={iosStyles.backLabel}>Voltar</Text>
            {unreadCount > 0 ? <TouchableOpacity onPress={handleMarkAllRead}><Text style={iosStyles.markAll}>Ler tudo</Text></TouchableOpacity> : <View style={{ width: 58 }} />}
          </View>

          <Text accessibilityRole="header" style={iosStyles.title}>Notificações</Text>
          <Text style={iosStyles.subtitle}>Fique por dentro de tudo que acontece{`\n`}com seus pedidos e novidades da KA Bijoux.</Text>

          {notifications.length === 0 ? (
            <>
              <Image source={require("../assets/redesign-ios/notifications-hero.png")} style={iosStyles.hero} contentFit="contain" />
              <Text style={iosStyles.emptyTitle}>Sem notificações{`\n`}por enquanto</Text>
              <Text style={iosStyles.emptyText}>Você receberá atualizações dos seus pedidos,{`\n`}novidades e ofertas especiais aqui.</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => void load()} activeOpacity={0.86}>
                <LinearGradient colors={["#ff6680", "#ec1760", "#b9004c"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={iosStyles.primaryButton}>
                  <Ionicons name="refresh-outline" size={22} color="#fff" />
                  <Text style={iosStyles.primaryButtonText}>Atualizar notificações</Text>
                  <Ionicons name="chevron-forward" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
              <View style={iosStyles.benefitsCard}>
                {[
                  ["cube-outline", "Atualizações de pedidos", "Saiba quando seu pedido for enviado e estiver a caminho."],
                  ["pricetag-outline", "Novidades exclusivas", "Seja a primeira a saber sobre lançamentos e promoções."],
                  ["heart-outline", "Tudo em um só lugar", "Receba avisos importantes da KA Bijoux."],
                ].map(([icon, heading, copy]) => (
                  <View key={heading} style={iosStyles.benefitRow}>
                    <View style={iosStyles.benefitIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color="#e70058" /></View>
                    <View style={{ flex: 1 }}><Text style={iosStyles.benefitTitle}>{heading}</Text><Text style={iosStyles.benefitText}>{copy}</Text></View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={iosStyles.notificationList}>
              {notifications.map((item) => (
                <TouchableOpacity key={item.id} style={[iosStyles.notificationCard, !item.read && iosStyles.notificationUnread]} onPress={() => handleMarkRead(item.id)}>
                  <View style={iosStyles.benefitIcon}><Ionicons name={TYPE_ICON[item.type] ?? "notifications"} size={23} color="#e70058" /></View>
                  <View style={{ flex: 1 }}><Text style={iosStyles.notificationTitle}>{item.title}</Text><Text style={iosStyles.notificationBody}>{item.body}</Text><Text style={iosStyles.notificationDate}>{formatDate(item.createdAt)}</Text></View>
                  {!item.read ? <View style={iosStyles.unreadDot} /> : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Voltar</Text></TouchableOpacity>
          <Text style={styles.title}>Notificações</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notificações</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAll}>Ler tudo</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Sem notificações</Text>
            <Text style={styles.emptyText}>Você receberá atualizações dos seus pedidos aqui.</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            onPress={() => handleMarkRead(item.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, !item.read && styles.iconBoxUnread]}>
              <Ionicons
                name={TYPE_ICON[item.type] ?? "notifications"}
                size={22}
                color={item.read ? Colors.textMuted : Colors.primary}
              />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>
                {item.title}
              </Text>
              <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
              <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.base, paddingTop: 12, paddingBottom: 8,
  },
  back: { color: Colors.primary, fontWeight: "600", fontSize: FontSizes.base },
  title: { fontSize: FontSizes.lg, fontWeight: "800", color: Colors.textPrimary },
  markAll: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: "600", width: 60, textAlign: "right" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: Spacing.base, gap: 10, paddingBottom: 30 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 10, marginTop: 80 },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: "700", color: Colors.textPrimary },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: "center" },
  card: {
    flexDirection: "row", gap: 14, alignItems: "flex-start",
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: 14, ...Shadows.sm,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconBox: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.background,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  iconBoxUnread: { backgroundColor: Colors.pinkSoft },
  cardTitle: { fontSize: FontSizes.sm, fontWeight: "500", color: Colors.textPrimary },
  cardTitleUnread: { fontWeight: "700" },
  cardBody: { fontSize: FontSizes.xs, color: Colors.textMuted, lineHeight: 18 },
  cardDate: { fontSize: FontSizes.xs, color: Colors.textLight, marginTop: 2 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary, marginTop: 4, flexShrink: 0,
  },
});

const iosStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff7f8" },
  content: { paddingHorizontal: 24, paddingBottom: 42 },
  topRow: { minHeight: 58, flexDirection: "row", alignItems: "center" },
  backButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", shadowColor: "#d97292", shadowOpacity: 0.13, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  backLabel: { marginLeft: 10, color: "#e10055", fontFamily: "Inter", fontSize: 16, flex: 1 },
  markAll: { color: "#d60050", fontFamily: "Inter", fontSize: 13, fontWeight: "700" },
  title: { marginTop: 6, color: "#a9003e", fontFamily: "PlayfairDisplay", fontSize: 36, textAlign: "center" },
  subtitle: { marginTop: 6, color: "#71747e", fontFamily: "Inter", fontSize: 16, lineHeight: 23, textAlign: "center" },
  hero: { width: "100%", height: 330, marginTop: 4 },
  emptyTitle: { color: "#aa003e", fontFamily: "PlayfairDisplay", fontSize: 32, lineHeight: 36, textAlign: "center", marginTop: -12 },
  emptyText: { color: "#777b84", fontFamily: "Inter", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 10 },
  primaryButton: { height: 58, borderRadius: 29, marginHorizontal: 32, marginTop: 22, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#df185e", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  primaryButtonText: { color: "#fff", fontFamily: "Inter", fontSize: 16, fontWeight: "700" },
  benefitsCard: { marginTop: 28, padding: 20, gap: 18, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.64)", borderWidth: 1, borderColor: "rgba(234,135,164,0.28)" },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  benefitIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(255,222,231,0.78)", alignItems: "center", justifyContent: "center" },
  benefitTitle: { color: "#641027", fontFamily: "Inter", fontSize: 14, fontWeight: "800" },
  benefitText: { color: "#7b7c84", fontFamily: "Inter", fontSize: 12, lineHeight: 17, marginTop: 3 },
  notificationList: { gap: 12, marginTop: 28 },
  notificationCard: { flexDirection: "row", gap: 13, padding: 16, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: "rgba(237,174,192,0.32)" },
  notificationUnread: { borderColor: "#ed6b98", backgroundColor: "rgba(255,244,248,0.96)" },
  notificationTitle: { color: "#5b1026", fontFamily: "Inter", fontSize: 15, fontWeight: "800" },
  notificationBody: { color: "#747680", fontFamily: "Inter", fontSize: 13, lineHeight: 19, marginTop: 3 },
  notificationDate: { color: "#ae9aa1", fontFamily: "Inter", fontSize: 11, marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#eb0058", marginTop: 6 },
});
